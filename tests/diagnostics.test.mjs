import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classifyDiagnosticError,
  isPublicIp,
  normalizeIp,
  normalizePublicIp,
} from "../src/lib/diagnostics.ts";

test("normalizes IPv4, IPv6, brackets and IPv4-mapped IPv6", () => {
  assert.deepEqual(normalizeIp(" 001.002.003.004 "), {
    ip: "1.2.3.4",
    rawIp: "001.002.003.004",
    version: 4,
  });
  assert.equal(normalizeIp("2001:0DB8:0:0:0:0:0:1")?.ip, "2001:db8::1");
  assert.equal(normalizeIp("[2001:db8::1]")?.ip, "2001:db8::1");
  assert.deepEqual(normalizeIp("::ffff:192.0.2.1")?.ip, "192.0.2.1");
  assert.equal(normalizeIp("1::2::3"), undefined);
  assert.equal(normalizeIp("1:2:3:4:5:6:7"), undefined);
  assert.equal(normalizeIp("1.2.3.999"), undefined);
  for (const ip of [
    "2001:db8:gggg::1",
    "2001:db8:10000::1",
    "2001:db8:NaN::1",
    "1:2:3:4:5:6:7:fffff",
  ])
    assert.equal(normalizeIp(ip), undefined, ip);
});

test("public IP validation excludes private, special and documentation ranges", () => {
  for (const ip of [
    "0.0.0.0",
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.1.1",
    "172.16.0.1",
    "192.168.1.1",
    "192.0.2.1",
    "198.18.0.0",
    "198.18.255.255",
    "198.19.12.34",
    "198.51.100.1",
    "203.0.113.1",
    "224.0.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "ff02::1",
    "2001:db8::1",
  ])
    assert.equal(isPublicIp(ip), false, ip);
  assert.equal(normalizePublicIp("8.8.8.8")?.ip, "8.8.8.8");
  assert.equal(normalizePublicIp("2001:4860:4860::8888")?.version, 6);
  assert.equal(isPublicIp("198.17.255.255"), true);
  assert.equal(isPublicIp("198.20.0.1"), true);
  assert.equal(isPublicIp("198.51.18.1"), true);
  assert.equal(isPublicIp("::ffff:8.8.8.8"), true);
});

test("diagnostic errors preserve known cancellation and timeout semantics", () => {
  assert.deepEqual(
    classifyDiagnosticError(new DOMException("x", "AbortError")),
    {
      status: "cancelled",
      errorCode: "aborted",
    },
  );
  assert.deepEqual(
    classifyDiagnosticError(new DOMException("x", "TimeoutError")),
    {
      status: "timeout",
      errorCode: "timeout",
    },
  );
  assert.deepEqual(
    classifyDiagnosticError(
      Object.assign(new Error("429"), { httpStatus: 429 }),
    ),
    { status: "rate_limited", errorCode: "rate_limit", httpStatus: 429 },
  );
  assert.deepEqual(classifyDiagnosticError(new TypeError("Failed to fetch")), {
    status: "network_error",
  });
});
