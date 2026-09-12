import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_REPORT_BYTES,
  parseDiagnosticReport,
} from "../src/lib/diagnostic-import.ts";

const now = new Date("2026-09-11T00:10:00.000Z");

test("imports a versioned report locally and overrides trust fields", () => {
  const report = parseDiagnosticReport(
    JSON.stringify({
      schemaVersion: 1,
      registryVersion: "terminal-v1",
      runId: "run-1",
      startedAt: "2026-09-11T00:00:00Z",
      finishedAt: "2026-09-11T00:01:00Z",
      results: [
        {
          schemaVersion: 1,
          runId: "run-1",
          sourceId: "ipify-v4",
          runtime: "terminal",
          execution: "client-request",
          subject: "caller-egress",
          provenance: "observed",
          verified: true,
          ip: "8.8.8.8",
          status: "ok",
          capturedAt: "2026-09-11T00:00:30Z",
        },
      ],
    }),
    now,
  );
  assert.equal(report.results.length, 1);
  assert.equal(report.results[0].ip, "8.8.8.8");
  assert.equal(report.results[0].provenance, "imported");
  assert.equal(report.results[0].verified, false);
  assert.equal(report.results[0].execution, "user-provided");
  assert.equal(report.results[0].receivedAt, now.toISOString());
});

test("invalid imported IPs become invalid observations and malformed envelopes are rejected", () => {
  const base = {
    schemaVersion: 1,
    registryVersion: "terminal-v1",
    runId: "run-1",
    startedAt: "2026-09-11T00:00:00Z",
    finishedAt: "2026-09-11T00:01:00Z",
    results: [
      {
        schemaVersion: 1,
        runId: "run-1",
        sourceId: "manual",
        runtime: "terminal",
        ip: "192.0.2.1",
        status: "ok",
      },
    ],
  };
  assert.equal(
    parseDiagnosticReport(JSON.stringify(base), now).results[0].status,
    "invalid",
  );
  assert.throws(
    () => parseDiagnosticReport(JSON.stringify({ ...base, extra: true }), now),
    /不受支持/,
  );
  assert.throws(
    () =>
      parseDiagnosticReport(
        JSON.stringify({
          ...base,
          results: [{ ...base.results[0], runId: "other" }],
        }),
        now,
      ),
    /上下文不匹配/,
  );
  assert.throws(
    () => parseDiagnosticReport("x".repeat(MAX_REPORT_BYTES + 1), now),
    /过大/,
  );
});

test("imports optional timing fields without trusting invalid durations", () => {
  const report = {
    schemaVersion: 1,
    registryVersion: "terminal-v1",
    runId: "timing",
    startedAt: "2026-09-11T00:00:00Z",
    finishedAt: "2026-09-11T00:01:00Z",
    results: [
      {
        schemaVersion: 1,
        runId: "timing",
        sourceId: "test-source",
        runtime: "terminal",
        ip: "1.1.1.1",
        status: "ok",
        latencyMs: 120,
        queueWaitMs: 20,
        networkMs: 100,
        totalMs: 120,
      },
    ],
  };
  const result = parseDiagnosticReport(JSON.stringify(report), now).results[0];
  assert.deepEqual(
    [result.latencyMs, result.queueWaitMs, result.networkMs, result.totalMs],
    [120, 20, 100, 120],
  );
  assert.equal(result.verified, false);
  Object.assign(report.results[0], {
    latencyMs: -1,
    queueWaitMs: "20",
    networkMs: null,
    totalMs: -3,
  });
  const invalid = parseDiagnosticReport(JSON.stringify(report), now).results[0];
  assert.deepEqual(
    [
      invalid.latencyMs,
      invalid.queueWaitMs,
      invalid.networkMs,
      invalid.totalMs,
    ],
    [undefined, undefined, undefined, undefined],
  );
});
