import assert from "node:assert/strict";
import { test } from "node:test";
import { ipNetwork } from "../public/worker/ip-network.js";

test("network details validate all announcing ASNs and preserve no-ROA vs unavailable", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = new URL(url);
    const data = u.pathname.includes("network-info")
      ? { prefix: "1.1.1.0/24", asns: ["13335", "123"] }
      : u.pathname.includes("reverse-dns")
        ? { result: ["one.one.one.one"] }
        : {
            status:
              u.searchParams.get("resource") === "13335" ? "valid" : "unknown",
          };
    return Response.json({ status: "ok", data });
  };
  try {
    const result = await ipNetwork("1.1.1.1");
    assert.equal(result.ptr, "one.one.one.one");
    assert.deepEqual(
      result.validations.map((v) => v.status),
      ["valid", "unknown"],
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("RIPE failure returns unavailable without inventing route data", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  try {
    const result = await ipNetwork("1.1.1.1");
    assert.equal(result.routeAvailable, false);
    assert.equal(result.prefix, undefined);
    assert.deepEqual(result.validations, []);
  } finally {
    globalThis.fetch = original;
  }
});

import { registrationServer } from '../public/worker/whois.js';
test('RDAP bootstrap chooses the longest matching IPv4 or IPv6 registration prefix', () => {
  const services = [
    [['124.0.0.0/8'], ['https://rdap.apnic.net/']],
    [['124.127.0.0/16'], ['https://specific.example/']],
    [['2001:db8::/32'], ['https://v6.example/']],
  ];
  assert.equal(registrationServer('124.127.77.179', services), 'https://specific.example/');
  assert.equal(registrationServer('2001:db8::1', services), 'https://v6.example/');
  assert.equal(registrationServer('8.8.8.8', services), undefined);
});
