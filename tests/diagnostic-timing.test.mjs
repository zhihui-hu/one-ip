import assert from "node:assert/strict";
import { test } from "node:test";
import { detectSiteResult } from "../src/views/home/api.ts";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("diagnostic timing separates queue wait from network time", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    await wait(10);
    return Response.json({ ip: "1.1.1.1" });
  };
  try {
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        detectSiteResult(
          {
            id: `timing-${index}`,
            name: "Timing source",
            type: "international",
            method: "ip-json",
            url: "https://example.com/ip",
            icon: "",
          },
          "timing-test",
        ),
      ),
    );
    assert.ok(results.every((result) => result.status === "ok"));
    assert.ok(results.every((result) => (result.networkMs ?? 0) >= 5));
    assert.ok(
      Math.max(...results.map((result) => result.queueWaitMs ?? 0)) >= 5,
    );
    for (const result of results) {
      assert.ok(
        Math.abs(
          (result.totalMs ?? 0) -
            (result.queueWaitMs ?? 0) -
            (result.networkMs ?? 0),
        ) <= 2,
      );
    }
  } finally {
    globalThis.fetch = original;
  }
});

test("link-only sources do not start network work or report network duration", async (t) => {
  t.mock.method(globalThis, "fetch", () =>
    assert.fail("link-only sources must not fetch"),
  );
  const result = await detectSiteResult(
    {
      id: "manual-source",
      name: "Manual",
      type: "international",
      method: "unsupported",
      execution: "link-only",
      icon: "",
    },
    "manual-run",
  );
  assert.equal(result.status, "unsupported");
  assert.equal(result.execution, "link-only");
  assert.equal(result.verified, false);
  assert.deepEqual(
    [result.queueWaitMs, result.networkMs, result.totalMs],
    [0, 0, 0],
  );
});
