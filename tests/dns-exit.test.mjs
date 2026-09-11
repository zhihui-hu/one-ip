import assert from "node:assert/strict";
import { test } from "node:test";
import { parseDnsResponse, detectDnsExits } from "../src/views/dns-exit/api.ts";

test("DNS parsers keep all resolvers and exclude Fastly client IP", () => {
  assert.deepEqual(
    parseDnsResponse("Fastly", {
      dns_resolver_info: { ip: "8.8.8.8", cc: "US", as_name: "Google" },
      client_ip_info: { ip: "1.2.3.4" },
    }),
    [{ ip: "8.8.8.8", geo: "US · Google" }],
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
    [{ ip: "8.8.8.8", geo: "Google" }],
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
