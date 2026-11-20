import assert from "node:assert/strict";
import { test } from "node:test";
import { geoIp, ipProfile, lookupIp, serviceStatus } from "../worker/ipbot.js";

const env = {};

async function withFetch(handler, run) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
}

test("ipbot public routes are called without credentials", async () => {
  await withFetch(
    async (url, init) => {
      assert.equal(url, "https://api.ipbot.net/api/geoip/8.8.8.8");
      assert.equal(init.headers.Authorization, undefined);
      assert.equal(init.redirect, "manual");
      return Response.json({
        ip: "8.8.8.8",
        country: "United States",
        country_code: "US",
        isp: "Google",
        asn: 15169,
        latitude: 37.4,
        longitude: -122.1,
        timezone: "America/Los_Angeles",
        region: null,
        source: "DB-IP Lite",
      });
    },
    async () => {
      assert.deepEqual(await geoIp("8.8.8.8", env), {
        ip: "8.8.8.8",
        country: "United States",
        country_code: "US",
        region: undefined,
        city: undefined,
        isp: "Google",
        asn: 15169,
        latitude: 37.4,
        longitude: -122.1,
        timezone: "America/Los_Angeles",
        source: "ipbot",
      });
    },
  );
});

test("IPBOT_API_URL overrides the ipbot origin", async () => {
  await withFetch(
    async (url) => {
      assert.equal(url, "http://127.0.0.1:27528/api/geoip/1.1.1.1");
      return Response.json({ ip: "1.1.1.1", country: "Australia" });
    },
    async () => {
      const geo = await geoIp("1.1.1.1", {
        IPBOT_API_URL: "http://127.0.0.1:27528/",
      });
      assert.equal(geo.country, "Australia");
    },
  );
});

test("ipbot answers for another address or without data are rejected", async () => {
  await assert.rejects(() => geoIp("127.0.0.1", env));
  await withFetch(
    async () => Response.json({ ip: "9.9.9.9", country: "Switzerland" }),
    async () => {
      await assert.rejects(() => geoIp("8.8.8.8", env));
      await assert.rejects(() => ipProfile("8.8.8.8", env));
      await assert.rejects(() => lookupIp("8.8.8.8", { ...env }));
    },
  );
  await withFetch(
    async () => Response.json({ ip: "8.8.8.8" }),
    async () => assert.rejects(() => geoIp("8.8.8.8", env)),
  );
});

test("ipbot upstream errors keep their status class", async () => {
  await withFetch(
    async () => new Response("{}", { status: 429 }),
    async () => assert.rejects(() => geoIp("8.8.8.8", env), { status: 429 }),
  );
  await withFetch(
    async () => new Response("{}", { status: 401 }),
    async () => assert.rejects(() => geoIp("8.8.8.8", env), { status: 502 }),
  );
});

test("ipbot lookup sources become Geo rows for the requested address", async () => {
  await withFetch(
    async (url) => {
      assert.equal(url, "https://api.ipbot.net/api/ip/lookup/1.1.1.1");
      return Response.json({
        geo: { ip: "1.1.1.1", country: "Australia", country_code: "AU" },
        sources: [
          { src: "DB-IP", country: "Australia", lat: -33.8, lon: 151.2 },
          { src: "ip2region", country: "Australia", lat: 999, lon: null },
        ],
        rdap: { name: "APNIC" },
      });
    },
    async () => {
      const result = await lookupIp("1.1.1.1", env);
      assert.equal(result.geo.source, "ipbot");
      assert.deepEqual(result.sources[0], {
        ip: "1.1.1.1",
        source: "ipbot / DB-IP",
        country: "Australia",
        country_code: undefined,
        region: undefined,
        city: undefined,
        latitude: -33.8,
        longitude: 151.2,
      });
      assert.equal(result.sources[1].latitude, undefined);
      assert.deepEqual(result.rdap, { name: "APNIC" });
    },
  );
});

test("ipbot profile is returned as-is for the requested address", async () => {
  await withFetch(
    async (url) => {
      assert.equal(url, "https://api.ipbot.net/api/ip/profile/1.1.1.1");
      return Response.json({ ip: "1.1.1.1", trust_score: 90 });
    },
    async () =>
      assert.deepEqual(await ipProfile("1.1.1.1", env), {
        ip: "1.1.1.1",
        trust_score: 90,
      }),
  );
});

test("service status hides ipbot's monitor provider", async () => {
  await withFetch(
    async (url) => {
      assert.equal(url, "https://api.ipbot.net/api/status/telegram");
      return Response.json({
        id: "telegram",
        status: {
          checkedAt: "2026-11-20T23:07:47.422Z",
          components: [
            {
              id: "telegram-website",
              name: "telegram.org (UptimeRobot)",
              status: "operational",
            },
          ],
          source: "https://uptimerobot.com/api/pulse/monitors/telegram/",
          status: { description: "ok", indicator: "none" },
        },
      });
    },
    async () => {
      const status = await serviceStatus("telegram", env);
      assert.equal(status.source, undefined);
      assert.equal(status.components[0].name, "telegram.org");
      assert.equal(status.status.indicator, "none");
    },
  );
});
