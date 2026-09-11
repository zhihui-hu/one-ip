import assert from "node:assert/strict";
import { test } from "node:test";
import worker from "../.worker-test/index.js";

const request = (query = "", headers = {}) =>
  new Request(`https://example.com/api/ip/health${query}`, { headers });

test("health API uses the caller IP, preserves false flags and returns uncached JSON", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.equal(url, "https://ip.net.coffee/api/ip/lookup/1.1.1.1");
    return Response.json({ ip: "1.1.1.1", trust_score: 75, is_vpn: false });
  });
  const response = await worker.fetch(
    request("", { "CF-Connecting-IP": "1.1.1.1" }),
    {},
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const data = await response.json();
  assert.equal(data.score, 75);
  assert.equal(data.status, "good");
  assert.equal(data.flags.vpn, false);
  assert.equal(data.flags.tor, null);
});

test("health score boundaries and unknown values match the UI", async (t) => {
  let score;
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ ip: "1.1.1.1", trust_score: score }),
  );
  for (const [value, status] of [
    [0, "poor"],
    [44, "poor"],
    [45, "moderate"],
    [74, "moderate"],
    [75, "good"],
    [100, "good"],
    [null, "unknown"],
    [-1, "unknown"],
    [101, "unknown"],
    ["90", "unknown"],
    [undefined, "unknown"],
  ]) {
    score = value;
    const response = await worker.fetch(request("?ip=1.1.1.1"), {});
    const data = await response.json();
    assert.equal(data.status, status);
    assert.equal(data.score, status === "unknown" ? null : value);
  }
});

test("health text handles IPv6 and strips terminal control characters", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.match(url, /2606%3A4700%3A4700%3A%3A1111$/);
    return Response.json({
      ip: "2606:4700:4700:0:0:0:0:1111",
      isp: "Example\u001b[31m\nInjected",
      trust_score: 90,
    });
  });
  const response = await worker.fetch(
    request("?ip=2606:4700:4700::1111&format=text"),
    { LOCAL_DEV: "true" },
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Content-Type"), /text\/plain/);
  const body = await response.text();
  assert.match(body, /score: 90\nstatus: good/);
  assert.ok(!body.includes("\u001b"));
  assert.ok(!body.includes("\nInjected"));
});

test("health rejects invalid targets, local caller detection and rate limits before fetching", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("must not fetch");
  });
  for (const query of [
    "?ip=",
    "?ip=127.0.0.1",
    "?ip=https://example.com",
    "?ip=1.1.1.1&format=html",
  ])
    assert.equal((await worker.fetch(request(query), {})).status, 400);
  assert.equal((await worker.fetch(request(), {})).status, 503);
  assert.equal(
    (
      await worker.fetch(request("", { "CF-Connecting-IP": "1.1.1.1" }), {
        LOCAL_DEV: "true",
      })
    ).status,
    503,
  );
  assert.equal(
    (
      await worker.fetch(request("?ip=1.1.1.1"), {
        API_LIMITER: { limit: async () => ({ success: false }) },
      })
    ).status,
    429,
  );
});

test("health reports mismatched, malformed and failed upstream responses", async (t) => {
  let response;
  t.mock.method(globalThis, "fetch", async () => response);
  for (const data of [{ ip: "8.8.8.8" }, {}, null]) {
    response = Response.json(data);
    assert.equal((await worker.fetch(request("?ip=1.1.1.1"), {})).status, 502);
  }
  response = new Response("private upstream body", { status: 429 });
  const result = await worker.fetch(request("?ip=1.1.1.1"), {});
  assert.equal(result.status, 429);
  assert.ok(!(await result.text()).includes("private upstream body"));
});
