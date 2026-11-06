import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assessWebRtc,
  collectFromCandidates,
  isPublicCandidate,
  parseCandidate,
} from "../src/views/webrtc/api.ts";

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

test("ICE candidate lines parse kind, protocol and related address", () => {
  assert.deepEqual(
    parseCandidate(
      "candidate:842163049 1 udp 1677729535 203.0.113.9 54321 typ srflx raddr 192.168.1.20 rport 50000 generation 0",
    ),
    {
      protocol: "udp",
      address: "203.0.113.9",
      port: 54321,
      kind: "srflx",
      relatedAddress: "192.168.1.20",
    },
  );
  assert.equal(
    parseCandidate("a=candidate:1 1 TCP 1 abc.local 9 typ host tcptype active")
      .protocol,
    "tcp",
  );
  assert.equal(parseCandidate("candidate:1 1 udp 1 1.2.3.4 9 typ bogus"), null);
  assert.equal(parseCandidate("garbage"), null);
});

test("candidate collection hides mDNS, keeps kinds apart and records exposed local IPs", () => {
  const { candidates, mdns, localExposed } = collectFromCandidates([
    "candidate:1 1 udp 2122260223 4b0f.local 50000 typ host generation 0",
    "candidate:2 1 tcp 1518280447 4b0f.local 9 typ host tcptype active",
    "candidate:3 1 udp 1686052607 203.0.113.9 50000 typ srflx raddr 0.0.0.0 rport 0",
    "a=candidate:3 1 tcp 1686052607 203.0.113.9 9 typ srflx raddr 0.0.0.0 rport 0",
    "candidate:4 1 udp 2122260223 203.0.113.9 50000 typ host",
    "candidate:5 1 udp 2122260223 10.0.0.5 50001 typ host",
    "candidate:6 1 udp 1686052607 2001:db8::1 50002 typ srflx raddr 192.168.1.20 rport 1",
  ]);
  assert.equal(mdns, 1);
  assert.deepEqual(localExposed.sort(), ["10.0.0.5", "192.168.1.20"]);
  assert.equal(candidates.length, 4);
  const srflx = candidates.find(
    (row) => row.kind === "srflx" && row.ip === "203.0.113.9",
  );
  assert.deepEqual(srflx.protocols, ["udp", "tcp"]);
  assert.equal(candidates.find((row) => row.ip === "2001:db8::1").family, 6);
});

test("WebRTC assessment compares against every HTTP egress family", () => {
  const rows = [
    { ip: "203.0.113.9", type: "", public: true, family: 4 },
    { ip: "2001:4860::1", type: "", public: true, family: 6 },
    { ip: "10.0.0.5", type: "", public: false, family: 4 },
  ];
  const both = assessWebRtc(rows, ["203.0.113.9", "2001:4860:0::1"], []);
  assert.equal(both.level, "safe");
  assert.deepEqual(
    both.results.map((row) => row.status),
    ["match", "match", "local"],
  );
  const v4Only = assessWebRtc(rows, ["203.0.113.9"], []);
  assert.equal(v4Only.level, "leak");
  assert.deepEqual(
    v4Only.leaking.map((row) => row.ip),
    ["2001:4860::1"],
  );
  assert.equal(
    assessWebRtc(rows.slice(0, 1), ["203.0.113.9"], ["10.0.0.5"]).level,
    "warning",
  );
  assert.equal(assessWebRtc(rows, [], []).level, "unknown");
  assert.equal(assessWebRtc([], ["203.0.113.9"], []).level, "unknown");
});
