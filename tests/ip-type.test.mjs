import assert from "node:assert/strict";
import { test } from "node:test";
import { ipType } from "../public/worker/ip-type.js";

test("IP classification validates results, caches exact IPs and suppresses unavailable results", async () => {
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;
  const saved = new Map();
  globalThis.caches = { default: {
    match: async (key) => saved.get(key.url)?.clone(),
    put: async (key, response) => saved.set(key.url, response),
  } };
  try {
    await assert.rejects(() => ipType("127.0.0.1", "https://tools.example.com"));
    for (const flags of [
      { hosting: true, mobile: false, proxy: true },
      { hosting: false, mobile: true, proxy: false },
      { hosting: false, mobile: false, proxy: false },
    ]) {
      saved.clear();
      globalThis.fetch = async (url) => {
        assert.equal(url, "http://ip-api.com/json/8.8.8.8?fields=status,query,hosting,mobile,proxy");
        return Response.json({ status: "success", query: "8.8.8.8", ...flags });
      };
      assert.deepEqual(await (await ipType("8.8.8.8", "https://tools.example.com")).json(), { available: true, ...flags });
      globalThis.fetch = async () => { throw new Error("cache miss"); };
      assert.deepEqual(await (await ipType("8.8.8.8", "https://tools.example.com")).json(), { available: true, ...flags });
    }
    saved.clear();
    for (const response of [
      Response.json({ status: "success", query: "8.8.8.9", hosting: true }),
      Response.json({ status: "success", query: "8.8.8.8" }),
      Response.json({ status: "fail" }),
      new Response("unavailable", { status: 503 }),
    ]) {
      globalThis.fetch = async () => response;
      const result = await ipType("8.8.8.8", "https://tools.example.com");
      assert.deepEqual(await result.json(), { available: false });
      assert.equal(result.headers.get("Cache-Control"), "no-store");
      assert.equal(saved.size, 0);
    }
    globalThis.fetch = async () => { throw new TypeError("timeout"); };
    assert.deepEqual(await (await ipType("8.8.8.8", "https://tools.example.com")).json(), { available: false });
    let calls = 0;
    globalThis.fetch = async () => { calls++; return new Response(null, { status: 429, headers: { "X-Ttl": "60" } }); };
    await ipType("8.8.8.8", "https://tools.example.com");
    assert.deepEqual(await (await ipType("1.1.1.1", "https://tools.example.com")).json(), { available: false });
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalCaches === undefined) delete globalThis.caches;
    else globalThis.caches = originalCaches;
  }
});
