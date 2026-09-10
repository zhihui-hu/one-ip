import assert from "node:assert/strict";
import { test } from "node:test";
import { getDomesticIp } from "../src/views/home/api.ts";

const primary = "https://necaptcha.nosdn.127.net/ab7f4275c1744aa28e0a8f3a1c58c532.png";
const secondary = "https://perfops.byte-test.com/500b-bench.jpg";

test("domestic probes read browser-exposed IP headers and fall back only to the independent domestic source", async () => {
  const original = globalThis.fetch;
  try {
    const urls = [];
    globalThis.fetch = async (url, init) => {
      urls.push(url);
      assert.equal(init.method, "HEAD");
      assert.equal(init.credentials, "omit");
      assert.equal(init.cache, "no-store");
      assert.equal(init.redirect, "error");
      return new Response(null, { headers: { "cdn-user-ip": "124.127.77.179" } });
    };
    assert.deepEqual(await getDomesticIp(), { ip: "124.127.77.179", source: "necaptcha.nosdn.127.net" });
    assert.deepEqual(urls, [primary]);
    for (const failure of ["network", "missing", "invalid"]) {
      urls.length = 0;
      globalThis.fetch = async (url) => {
        urls.push(url);
        if (url === primary) {
          if (failure === "network") throw new TypeError("unavailable");
          return new Response(null, { headers: failure === "invalid" ? { "cdn-user-ip": "999.0.0.1" } : {} });
        }
        return new Response(null, { headers: { "x-request-ip": "124.127.77.179" } });
      };
      assert.equal((await getDomesticIp()).source, "perfops.byte-test.com");
      assert.deepEqual(urls, [primary, secondary]);
    }
    globalThis.fetch = async () => { throw new TypeError("unavailable"); };
    await assert.rejects(getDomesticIp());
    const controller = new AbortController();
    let calls = 0;
    globalThis.fetch = async () => { calls++; controller.abort(); throw controller.signal.reason; };
    await assert.rejects(getDomesticIp(controller.signal));
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});
