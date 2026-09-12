import {
  diagnosticResult,
  type DiagnosticResult,
  type DiagnosticStatus,
} from "./diagnostics.ts";

export const DIAGNOSTIC_SCHEMA_VERSION = 1 as const;
export const MAX_REPORT_BYTES = 256 * 1024;
export const MAX_RESULT_COUNT = 128;
export const MAX_STRING_LENGTH = 2048;

export interface DiagnosticReport {
  schemaVersion: typeof DIAGNOSTIC_SCHEMA_VERSION;
  registryVersion: string;
  runId: string;
  startedAt: string;
  finishedAt: string;
  results: DiagnosticResult[];
}

const statuses = new Set<DiagnosticStatus>([
  "ok",
  "timeout",
  "network_error",
  "http_error",
  "rate_limited",
  "parse_error",
  "invalid",
  "unsupported",
  "cancelled",
]);

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function assertKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  field: string,
) {
  const unknown = Object.keys(value).find((key) => !allowed.has(key));
  if (unknown) throw new Error(`导入字段不受支持：${field}.${unknown}`);
}

function string(value: unknown, field: string, max = MAX_STRING_LENGTH) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error(`导入字段无效：${field}`);
  return value;
}

function timestamp(value: unknown, field: string, now: number) {
  const result = string(value, field, 64);
  const parsed = Date.parse(result);
  if (!Number.isFinite(parsed) || parsed > now + 5 * 60 * 1000)
    throw new Error(`导入时间无效：${field}`);
  return new Date(parsed).toISOString();
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function duration(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

export function parseDiagnosticReport(
  input: string,
  now = new Date(),
): DiagnosticReport {
  if (typeof input !== "string" || byteLength(input) > MAX_REPORT_BYTES)
    throw new Error("导入报告过大");
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error("导入报告不是有效 JSON");
  }
  const report = object(parsed);
  if (!report || report.schemaVersion !== DIAGNOSTIC_SCHEMA_VERSION)
    throw new Error("不支持的导入版本");
  assertKeys(
    report,
    new Set([
      "schemaVersion",
      "registryVersion",
      "runId",
      "startedAt",
      "finishedAt",
      "results",
    ]),
    "report",
  );
  const registryVersion = string(
    report.registryVersion,
    "registryVersion",
    128,
  );
  const runId = string(report.runId, "runId", 128);
  const nowMs = now.getTime();
  const startedAt = timestamp(report.startedAt, "startedAt", nowMs);
  const finishedAt = timestamp(report.finishedAt, "finishedAt", nowMs);
  if (Date.parse(finishedAt) < Date.parse(startedAt))
    throw new Error("导入时间顺序无效");
  if (
    !Array.isArray(report.results) ||
    report.results.length > MAX_RESULT_COUNT
  )
    throw new Error("导入结果数量无效");
  const receivedAt = now.toISOString();
  const results = report.results.map((value, index) => {
    const item = object(value);
    if (!item) throw new Error(`导入结果无效：第 ${index + 1} 项`);
    assertKeys(
      item,
      new Set([
        "schemaVersion",
        "runId",
        "sourceId",
        "runtime",
        "execution",
        "subject",
        "provenance",
        "verified",
        "ip",
        "version",
        "status",
        "httpStatus",
        "latencyMs",
        "queueWaitMs",
        "networkMs",
        "totalMs",
        "errorCode",
        "capturedAt",
        "receivedAt",
      ]),
      `results[${index}]`,
    );
    if (
      item.schemaVersion !== DIAGNOSTIC_SCHEMA_VERSION ||
      item.runId !== runId
    )
      throw new Error(`导入结果上下文不匹配：第 ${index + 1} 项`);
    const sourceId = string(item.sourceId, `results[${index}].sourceId`, 128);
    if (item.runtime !== "terminal" && item.runtime !== "app")
      throw new Error(`导入运行时无效：第 ${index + 1} 项`);
    const runtime = item.runtime;
    if (
      item.subject !== undefined &&
      item.subject !== "caller-egress" &&
      item.subject !== "lookup-target" &&
      item.subject !== "worker-egress"
    )
      throw new Error(`导入 subject 无效：第 ${index + 1} 项`);
    const subject = item.subject ?? "caller-egress";
    const status = statuses.has(item.status as DiagnosticStatus)
      ? (item.status as DiagnosticStatus)
      : "invalid";
    const capturedAt =
      item.capturedAt === undefined
        ? undefined
        : timestamp(item.capturedAt, `results[${index}].capturedAt`, nowMs);
    return diagnosticResult(
      {
        runId,
        sourceId,
        runtime,
        execution: "user-provided",
        subject,
        provenance: "imported",
        verified: false,
      },
      {
        status,
        ip: item.ip,
        latencyMs: duration(item.latencyMs),
        queueWaitMs: duration(item.queueWaitMs),
        networkMs: duration(item.networkMs),
        totalMs: duration(item.totalMs),
        httpStatus:
          typeof item.httpStatus === "number" &&
          Number.isInteger(item.httpStatus) &&
          item.httpStatus >= 100 &&
          item.httpStatus <= 599
            ? item.httpStatus
            : undefined,
        capturedAt,
      },
      receivedAt,
    );
  });
  return {
    schemaVersion: DIAGNOSTIC_SCHEMA_VERSION,
    registryVersion,
    runId,
    startedAt,
    finishedAt,
    results,
  };
}
