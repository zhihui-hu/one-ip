import assert from "node:assert/strict";
import { test } from "node:test";
import { isPublicCandidate } from "../src/views/webrtc/api.ts";

test("equivalent IPv6 forms preserve local and public classifications", () => {
  for (const ip of [
    "::1",
    "0:0:0:0:0:0:0:1",
    "::",
    "0:0:0:0:0:0:0:0",
    "::ffff:192.168.1.1",
    "::ffff:c0a8:101",
    "0:0:0:0:0:ffff:c0a8:101",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "fe80::1",
    "FD00::1",
    "ff02::1",
  ])
    assert.equal(isPublicCandidate(ip), false, ip);
  for (const ip of [
    "1.1.1.1",
    "2001:4860:4860::8888",
    "::ffff:1.1.1.1",
    "::ffff:101:101",
  ])
    assert.equal(isPublicCandidate(ip), true, ip);
});

test("malformed IPv6 candidates are rejected", () => {
  for (const ip of [":::1", "2001::db8::1", "abcd:", "::ffff:999.1.1.1"])
    assert.equal(isPublicCandidate(ip), false, ip);
});
