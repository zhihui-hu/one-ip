import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSourceRegistry } from "../src/lib/diagnostic-source.ts";
import { executeSource } from "../src/lib/source-probe.ts";

test("header sources read only their configured response header", async () => {
  const [source] = buildSourceRegistry([
    {
      id: "header-source",
      name: "Header source",
      type: "domestic",
      method: "headers",
      url: "https://example.com/edge",
      responseHeader: "x-request-ip",
      icon: "https://icons.duckduckgo.com/ip3/example.com.ico",
    },
  ]);
  const original = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, init) => {
    request = { url, method: init.method };
    return new Response(null, {
      status: 204,
      headers: { "cdn-user-ip": "8.8.8.8", "x-request-ip": "1.1.1.1" },
    });
  };
  try {
    const result = await executeSource(source);
    assert.deepEqual(result, { ip: "1.1.1.1", source: "Header source" });
    assert.deepEqual(request, {
      url: "https://example.com/edge",
      method: "HEAD",
    });
    globalThis.fetch = async () =>
      new Response(null, {
        status: 204,
        headers: { "cdn-user-ip": "8.8.8.8" },
      });
    await assert.rejects(executeSource(source), /出口 IP/);
  } finally {
    globalThis.fetch = original;
  }
});

test("trace sources preserve metadata and enforce their address family", async (t) => {
  const [source] = buildSourceRegistry([
    {
      id: "trace-source",
      name: "Trace",
      type: "international",
      method: "cftrace",
      domain: "example.com",
      addressFamily: "ipv4",
      icon: "https://example.com/favicon.ico",
    },
  ]);
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("ip=2606:4700:4700::1111\nloc=US\ncolo=SJC\n"),
  );
  await assert.rejects(executeSource(source), /出口 IP/);
  const result = await executeSource({ ...source, addressFamily: "ipv6" });
  assert.equal(result.ip, "2606:4700:4700::1111");
  assert.equal(result.country_code, "US");
  assert.equal(result.colo, "SJC");
});
