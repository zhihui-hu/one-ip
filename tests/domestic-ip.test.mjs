import assert from "node:assert/strict";
import { test } from "node:test";
import { getDomesticIp } from "../src/views/home/api.ts";

test("domestic probe bypasses cache and never falls back to a different routed provider", async () => {
  const original = globalThis.fetch;
  const urls = [];
  try {
    globalThis.fetch = async (url, init) => {
      urls.push(url);
      assert.equal(init.cache, "no-store");
      throw new TypeError("network failure");
    };
    await assert.rejects(getDomesticIp());
    assert.deepEqual(urls, ["https://2026.ip138.com/"]);
    globalThis.fetch = async () => new Response("IP: 124.127.77.179");
    assert.deepEqual(await getDomesticIp(), { ip: "124.127.77.179", source: "2026.ip138.com" });
  } finally { globalThis.fetch = original; }
});
