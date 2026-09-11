import assert from "node:assert/strict";
import { test } from "node:test";
import { sampleDnsExit } from "../src/views/dns-exit/api.ts";

test("DNS samples use unique hosts, bypass cache, and return resolver data", async () => {
  const original = globalThis.fetch;
  const hosts = [];
  globalThis.fetch = async (url, init) => {
    hosts.push(new URL(url).hostname);
    assert.equal(init.cache, "no-store");
    assert.ok(init.signal instanceof AbortSignal);
    return Response.json({ dns: { ip: "1.1.1.1", geo: "test" } });
  };
  try {
    const signal = new AbortController().signal;
    assert.deepEqual(await sampleDnsExit(signal), {
      ip: "1.1.1.1",
      geo: "test",
    });
    await sampleDnsExit(signal);
    assert.notEqual(hosts[0], hosts[1]);
    assert.ok(
      hosts.every((host) => /^[a-f0-9]{32}\.edns\.ip-api\.com$/.test(host)),
    );
    globalThis.fetch = async () => Response.json({});
    await assert.rejects(sampleDnsExit(signal), /DNS/);
    const controller = new AbortController();
    globalThis.fetch = async () => {
      controller.abort();
      return Response.json({ dns: { ip: "1.1.1.1", geo: "test" } });
    };
    await assert.rejects(sampleDnsExit(controller.signal), {
      name: "AbortError",
    });
  } finally {
    globalThis.fetch = original;
  }
});
