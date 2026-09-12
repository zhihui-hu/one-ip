import assert from "node:assert/strict";
import { test } from "node:test";
import { geoIp, secondaryGeo } from "../public/worker/geo.js";
import { getGeo } from "../src/views/home/api.ts";

async function withFetch(fetch, run) {
  const original = globalThis.fetch;
  globalThis.fetch = fetch;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}

test("browser Geo fallback gets a fresh timeout after ip.sb times out", async () => {
  const calls = [];
  await withFetch(
    (url, init) => {
      calls.push(url);
      if (url.includes("api.ip.sb")) {
        return new Promise((_, reject) => {
          init.signal.addEventListener(
            "abort",
            () => reject(init.signal.reason),
            { once: true },
          );
        });
      }
      assert.equal(init.signal.aborted, false);
      return Promise.resolve(
        Response.json({
          success: true,
          ip: "1.1.1.1",
          country: "United States",
        }),
      );
    },
    async () => {
      const result = await getGeo("1.1.1.1", undefined, 20);
      assert.equal(result.source, "ipwho.is");
      assert.deepEqual(calls, [
        "https://api.ip.sb/geoip/1.1.1.1",
        "https://ipwho.is/1.1.1.1",
      ]);
    },
  );
});

test("browser Geo cancellation stops the fallback", async () => {
  const controller = new AbortController();
  const calls = [];
  await withFetch(
    (url, init) => {
      calls.push(url);
      return new Promise((_, reject) => {
        init.signal.addEventListener(
          "abort",
          () => reject(init.signal.reason),
          { once: true },
        );
        setTimeout(() => controller.abort(), 5);
      });
    },
    async () => {
      await assert.rejects(getGeo("1.1.1.1", controller.signal, 100), {
        name: "AbortError",
      });
      assert.deepEqual(calls, ["https://api.ip.sb/geoip/1.1.1.1"]);
    },
  );
});

test("browser Geo rejects an ipwho.is response for another IP", async () => {
  await withFetch(
    (url) => {
      if (url.includes("api.ip.sb"))
        return Promise.resolve(Response.json({ ip: "8.8.8.8", country: "US" }));
      return Promise.resolve(
        Response.json({
          success: true,
          ip: "8.8.8.8",
          country: "United States",
        }),
      );
    },
    async () => {
      await assert.rejects(getGeo("1.1.1.1"), /归属信息不完整/);
    },
  );
});

test("worker Geo adapters normalize matching addresses and reject mismatches", async () => {
  await withFetch(
    async (url) => {
      if (url.startsWith("https://ipwho.is/"))
        return Response.json({
          success: true,
          ip: " 2606:4700:4700:0:0:0:0:1111 ",
          country: "United States",
        });
      return Response.json({
        ip: "2606:4700:4700:0:0:0:0:1111",
        country: "United States",
      });
    },
    async () => {
      assert.equal(
        (await geoIp("2606:4700:4700::1111")).ip,
        "2606:4700:4700::1111",
      );
      assert.equal(
        (await secondaryGeo("2606:4700:4700::1111")).ip,
        "2606:4700:4700::1111",
      );
    },
  );

  await withFetch(
    async (url) => {
      if (url.startsWith("https://ipwho.is/"))
        return Response.json({ success: true, ip: "8.8.8.8" });
      return Response.json({ ip: "8.8.8.8" });
    },
    async () => {
      await assert.rejects(() => geoIp("1.1.1.1"), /不匹配/);
      await assert.rejects(() => secondaryGeo("1.1.1.1"), /不匹配/);
    },
  );
});
