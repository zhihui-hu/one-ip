import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assessDnsLeak,
  detectDnsExits,
  parseDnsResponse,
  publicDnsProvider,
} from "../src/views/dns-exit/api.ts";

test("DNS parsers keep all resolvers and exclude Fastly client IP", () => {
  assert.deepEqual(
    parseDnsResponse("Fastly", {
      dns_resolver_info: {
        ip: "8.8.8.8",
        cc: "US",
        as_name: "GOOGLE - Google LLC, US",
      },
      client_ip_info: { ip: "1.2.3.4" },
    }),
    [
      {
        ip: "8.8.8.8",
        geo: "US · GOOGLE - Google LLC, US",
        country: "US",
        isp: "Google LLC",
      },
    ],
  );
  assert.equal(
    parseDnsResponse("BrowserLeaks DNS6", {
      "2001:4860::1": ["US", "United States", "Google"],
      "2001:4860::2": ["US", "United States", "Google"],
    }).length,
    2,
  );
  assert.deepEqual(
    parseDnsResponse("Surfshark", { "8.8.8.8": { ISP: "Google", Leak: true } }),
    [{ ip: "8.8.8.8", geo: "Google", isp: "Google" }],
  );
  assert.deepEqual(
    parseDnsResponse("BrowserLeaks DNS4", {
      "8.8.4.4": ["us", "United States, Los Angeles", "Google LLC"],
      "1.1.1.1": ["", "Somewhere", "None"],
    }),
    [
      {
        ip: "8.8.4.4",
        geo: "United States, Los Angeles · Google LLC",
        country: "US",
        isp: "Google LLC",
      },
      { ip: "1.1.1.1", geo: "Somewhere" },
    ],
  );
  assert.deepEqual(
    parseDnsResponse("Surfshark", {
      "8.8.8.8": { ISP: "Google", Country: "United States", CountryCode: "US" },
    }),
    [
      {
        ip: "8.8.8.8",
        geo: "United States · Google",
        country: "US",
        isp: "Google",
      },
    ],
  );
  assert.deepEqual(
    parseDnsResponse("Fastly", {
      dns_resolver_info: { ip: "not found", cc: "US" },
    }),
    [],
  );
  assert.deepEqual(
    parseDnsResponse("Fastly", { client_ip_info: { ip: "1.2.3.4" } }),
    [],
  );
});

test("multi-source probes merge results, retain failures and use fresh domains", async () => {
  const original = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(url);
    assert.match(new URL(url).hostname.split(".")[0], /^[a-f0-9]{10}$/);
    if (url.includes("dns6.")) throw new Error("unavailable");
    const data = url.includes("fastly")
      ? { dns_resolver_info: { ip: "8.8.8.8" } }
      : url.includes("surfshark")
        ? { "8.8.8.8": { ISP: "Google" } }
        : {
            "8.8.8.8": ["US", "United States", "Google"],
            "1.1.1.1": ["US", "United States", "Cloudflare"],
          };
    return Response.json(data);
  };
  try {
    const snapshots = [];
    const result = await detectDnsExits(new AbortController().signal, (s) =>
      snapshots.push(s),
    );
    assert.equal(result.count, 16);
    assert.equal(result.failed, 3);
    assert.equal(result.results.length, 2);
    assert.equal(result.results[0].samples, 13);
    assert.equal(result.results[0].sources.length, 3);
    assert.equal(new Set(urls).size, 16);
    assert.deepEqual(snapshots[0].results, []);
    assert.equal(snapshots.find((s) => s.results.length).results[0].samples, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("DNS leak assessment compares resolver countries with HTTP egress", () => {
  const resolvers = [
    { ip: "8.8.8.8", geo: "", country: "US" },
    { ip: "202.96.128.86", geo: "", country: "CN" },
    { ip: "9.9.9.9", geo: "" },
  ];
  const leak = assessDnsLeak(resolvers, ["us", undefined]);
  assert.equal(leak.level, "leak");
  assert.deepEqual(leak.egressCountries, ["US"]);
  assert.deepEqual(
    leak.mismatched.map((item) => item.ip),
    ["202.96.128.86"],
  );
  assert.equal(leak.relations["9.9.9.9"], "unknown");
  assert.equal(assessDnsLeak(resolvers.slice(0, 1), ["US"]).level, "safe");
  assert.equal(
    assessDnsLeak([resolvers[0], resolvers[2]], ["US", "JP"]).level,
    "warning",
  );
  assert.equal(assessDnsLeak(resolvers, []).level, "unknown");
  assert.equal(assessDnsLeak([], ["US"]).level, "unknown");
});

test("well-known public resolvers are labelled by ISP", () => {
  assert.equal(publicDnsProvider("Google LLC"), "Google");
  assert.equal(publicDnsProvider("Cloudflare, Inc."), "Cloudflare");
  assert.equal(publicDnsProvider("China Telecom"), undefined);
  assert.equal(publicDnsProvider(undefined), undefined);
});
