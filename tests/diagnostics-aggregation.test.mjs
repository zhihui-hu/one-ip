import assert from "node:assert/strict";
import { test } from "node:test";
import {
  aggregateIpObservations,
  compareRuntimeResults,
  diagnosticResult,
} from "../src/lib/diagnostics.ts";

const context = (sourceId, runtime = "browser", overrides = {}) => ({
  runId: "run-1",
  sourceId,
  runtime,
  execution: runtime === "browser" ? "client-request" : "user-provided",
  subject: "caller-egress",
  provenance: runtime === "browser" ? "observed" : "imported",
  verified: runtime === "browser",
  ...overrides,
});

test("aggregation uses the latest source attempt and keeps failed attempts out of success groups", () => {
  const results = [
    diagnosticResult(context("a"), {
      status: "ok",
      ip: "8.8.8.8",
      capturedAt: "2026-09-11T00:00:00Z",
    }),
    diagnosticResult(context("a"), {
      status: "timeout",
      capturedAt: "2026-09-11T00:01:00Z",
    }),
    diagnosticResult(context("b"), {
      status: "ok",
      ip: "8.8.8.8",
      capturedAt: "2026-09-11T00:00:30Z",
    }),
    diagnosticResult(context("c"), {
      status: "ok",
      ip: "1.1.1.1",
      capturedAt: "2026-09-11T00:00:40Z",
    }),
  ];
  const groups = aggregateIpObservations(
    results,
    new Map([
      ["a", "family-a"],
      ["b", "family-a"],
      ["c", "family-c"],
    ]),
  );
  assert.deepEqual(
    groups.map((group) => [group.ip, group.sourceIds, group.attemptCount]),
    [
      ["1.1.1.1", ["c"], 3],
      ["8.8.8.8", ["b"], 3],
    ],
  );
  assert.equal(groups[1].consistency, 1 / 2);
  assert.equal(groups[1].providerFamilies.join(","), "family-a");
});

test("runtime comparison requires matching source and timestamp, and labels imported terminal data", () => {
  const browserTime = "2026-09-11T00:00:00Z";
  const browser = [
    diagnosticResult(context("same"), {
      status: "ok",
      ip: "8.8.8.8",
      capturedAt: browserTime,
    }),
    diagnosticResult(context("different"), {
      status: "ok",
      ip: "1.1.1.1",
      capturedAt: browserTime,
    }),
    diagnosticResult(context("protocol"), {
      status: "ok",
      ip: "8.8.8.8",
      capturedAt: browserTime,
    }),
  ];
  const terminal = [
    diagnosticResult(context("same", "terminal"), {
      status: "ok",
      ip: "8.8.8.8",
      capturedAt: "2026-09-11T00:04:59Z",
    }),
    diagnosticResult(context("different", "terminal"), {
      status: "ok",
      ip: "9.9.9.9",
      capturedAt: browserTime,
    }),
    diagnosticResult(context("protocol", "terminal"), {
      status: "ok",
      ip: "2001:4860:4860::8888",
      capturedAt: browserTime,
    }),
    diagnosticResult(context("stale", "terminal"), {
      status: "ok",
      ip: "8.8.8.8",
      capturedAt: "2026-09-11T00:06:00Z",
    }),
  ];
  assert.deepEqual(
    compareRuntimeResults(browser, terminal).map((item) => [
      item.sourceId,
      item.relation,
      item.userProvided,
    ]),
    [
      ["same", "same", true],
      ["different", "different", true],
      ["protocol", "protocol-different", true],
    ],
  );
});

test("result construction rejects an invalid IP even when the adapter reports success", () => {
  const result = diagnosticResult(context("invalid"), {
    status: "ok",
    ip: "192.0.2.1",
  });
  assert.equal(result.status, "invalid");
  assert.equal(result.errorCode, "invalid_ip");
  assert.equal(result.ip, undefined);
});
