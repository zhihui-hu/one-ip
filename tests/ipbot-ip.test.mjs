import assert from "node:assert/strict";
import { test } from "node:test";
import { lookupIp } from "../src/views/ip/api.ts";
import { adaptIpbot, ipbotProfileSchema } from "../src/views/ip/ipbot.ts";

test("ipbot score, flags and coordinates are preserved, null source coordinates are skipped", () => {
  const result = adaptIpbot(
    ipbotProfileSchema.parse({
      ip: "124.127.77.179",
      trust_score: 97,
      isResidential: true,
      is_mobile: false,
      isp: "China Telecom",
      timezone: "Asia/Shanghai",
      geo_sources: [
        { src: "g1", lat: null, lon: null },
        { src: "g2", lat: 39.911, lon: 116.395 },
      ],
    }),
  );
  assert.equal(result.profile.trust_score, 97);
  assert.equal(result.profile.isResidential, true);
  assert.equal(result.geo.latitude, 39.911);
  assert.equal(result.geo.isp, "China Telecom");
  assert.equal(result.geo.timezone, "Asia/Shanghai");
  assert.equal(result.geo.source, "ipbot");
  assert.equal(result.sources[1].source, "ipbot / g2");
  assert.equal(result.sources[0].latitude, undefined);
  assert.equal(result.risk.vpn, undefined);
});
test("top-level ipbot coordinates win over per-source coordinates", () => {
  const result = adaptIpbot(
    ipbotProfileSchema.parse({
      ip: "1.1.1.1",
      latitude: -33.86,
      longitude: 151.2,
      geo_sources: [{ src: "g", lat: 1, lon: 2 }],
    }),
  );
  assert.equal(result.geo.latitude, -33.86);
  assert.equal(result.geo.longitude, 151.2);
});
test("ipbot history collapses repeated ASN and location runs", () => {
  const profile = ipbotProfileSchema.parse({
    ip: "1.1.1.1",
    history: [
      { to: "2026-11-20", country_code: "au", city: "Sydney", asn: 13335 },
      { to: "2026-10-27", country_code: "au", city: "Melbourne", asn: 13335 },
      { to: "2026-09-01", country_code: "au", city: "Melbourne", asn: 13335 },
    ],
  });
  assert.deepEqual(
    profile.location_history.map((row) => row.city),
    ["Sydney", "Melbourne"],
  );
  assert.equal(profile.location_history[0].country, "AU");
  assert.equal(profile.asn_history.length, 1);
});
test("ipbot history periods become location and ASN history", () => {
  const profile = ipbotProfileSchema.parse({
    ip: "1.1.1.1",
    registered_country_code: "AU",
    history: [
      {
        from: "2026-09-02",
        to: "2026-09-30",
        country_code: "us",
        region: "California",
        city: "Livermore",
        asn: 7922,
        organization: "Comcast",
      },
    ],
  });
  assert.equal(profile.registered_country, "AU");
  assert.deepEqual(profile.location_history, [
    {
      country: "US",
      region: "California",
      city: "Livermore",
      seen_at: Date.UTC(2026, 8, 30) / 1000,
    },
  ]);
  assert.deepEqual(profile.asn_history, [
    { asn: 7922, asn_org: "Comcast", seen_at: Date.UTC(2026, 8, 30) / 1000 },
  ]);
  assert.equal(
    ipbotProfileSchema.parse({ ip: "1.1.1.1", history: "bad" })
      .location_history,
    undefined,
  );
});
test("IP profile is read from the same-origin Worker and mismatched results are rejected", async () => {
  const original = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return Response.json({ ip: "8.8.8.8" });
  };
  try {
    await assert.rejects(lookupIp("1.1.1.1"));
    assert.match(urls[0], /\/api\/ip\/profile\/1\.1\.1\.1$/);
    assert.ok(urls.every((url) => !/net\.coffee|ipwho|ipquery/.test(url)));
  } finally {
    globalThis.fetch = original;
  }
});
test("IP lookup falls back to the ipbot location lookup when the profile fails", async () => {
  const { lookupIpWithFallback } = await import("../src/views/ip/api.ts");
  const original = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    if (String(url).includes("/api/ip/profile/"))
      return new Response("{}", { status: 502 });
    return Response.json({
      geo: {
        ip: "1.1.1.1",
        country: "Australia",
        country_code: "AU",
        asn: 13335,
        source: "ipbot",
      },
      sources: [
        { ip: "1.1.1.1", country: "Australia", source: "ipbot / DB-IP" },
        { ip: "9.9.9.9", source: "bad" },
      ],
    });
  };
  try {
    const result = await lookupIpWithFallback("1.1.1.1");
    assert.equal(result.fallback, true);
    assert.equal(result.profile.countryCode, "AU");
    assert.equal(result.profile.asn, 13335);
    assert.equal(result.sources.length, 1);
    assert.equal(result.risk.available, false);
    assert.match(urls.at(-1), /\/api\/ip\/lookup\/1\.1\.1\.1$/);
  } finally {
    globalThis.fetch = original;
  }
});
test("IP lookup keeps the profile error when the fallback also fails", async () => {
  const { lookupIpWithFallback } = await import("../src/views/ip/api.ts");
  const original = globalThis.fetch;
  globalThis.fetch = async (url) =>
    String(url).includes("/api/ip/profile/")
      ? Response.json({ ip: "8.8.8.8" })
      : new Response("{}", { status: 502 });
  try {
    await assert.rejects(lookupIpWithFallback("1.1.1.1"), /不匹配|match/i);
  } finally {
    globalThis.fetch = original;
  }
});
test("home geo lookup only uses the same-origin ipbot route", async () => {
  const { getGeo } = await import("../src/views/home/api.ts");
  const original = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return Response.json({
      ip: "1.1.1.1",
      country: "Australia",
      source: "ipbot",
    });
  };
  try {
    const geo = await getGeo("1.1.1.1");
    assert.equal(geo.country, "Australia");
    assert.equal(urls.length, 1);
    assert.match(urls[0], /\/api\/geoip\/1\.1\.1\.1$/);
  } finally {
    globalThis.fetch = original;
  }
});
