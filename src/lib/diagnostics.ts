import type { Geo, Risk } from "./types";

export type IpVersion = 4 | 6;

export interface NormalizedIp {
  ip: string;
  rawIp: string;
  version: IpVersion;
}

export type DiagnosticStatus =
  | "ok"
  | "timeout"
  | "network_error"
  | "http_error"
  | "rate_limited"
  | "parse_error"
  | "invalid"
  | "unsupported"
  | "cancelled";

export interface DiagnosticResult {
  schemaVersion: 1;
  runId: string;
  sourceId: string;
  runtime: "browser" | "terminal" | "app";
  execution:
    "client-request" | "worker-fixed-upstream" | "user-provided" | "link-only";
  subject: "caller-egress" | "lookup-target" | "worker-egress";
  provenance: "observed" | "declared" | "imported";
  verified: boolean;
  ip?: string;
  version?: IpVersion;
  rawIp?: string;
  latencyMs?: number;
  queueWaitMs?: number;
  networkMs?: number;
  totalMs?: number;
  details?: Array<{
    sourceId: string;
    capturedAt: string;
    geo?: Geo;
    risk?: Risk;
  }>;
  status: DiagnosticStatus;
  httpStatus?: number;
  errorCode?:
    | "timeout"
    | "dns_error"
    | "tls_error"
    | "cors"
    | "http"
    | "rate_limit"
    | "invalid_ip"
    | "invalid_payload"
    | "aborted";
  capturedAt?: string;
  receivedAt: string;
}

export interface DiagnosticContext {
  runId: string;
  sourceId: string;
  runtime: "browser" | "terminal" | "app";
  execution: DiagnosticResult["execution"];
  subject: DiagnosticResult["subject"];
  provenance: DiagnosticResult["provenance"];
  verified: boolean;
}

export interface RuntimeComparison {
  sourceId: string;
  browser: DiagnosticResult;
  terminal: DiagnosticResult;
  relation: "same" | "different" | "protocol-different";
  userProvided: boolean;
}

export interface IpObservationGroup {
  runtime: DiagnosticResult["runtime"];
  version: IpVersion;
  ip: string;
  sourceIds: string[];
  providerFamilies: string[];
  unknownProviderCount: number;
  successCount: number;
  attemptCount: number;
  consistency: number | null;
}

type ResultFields = Pick<
  DiagnosticResult,
  "status" | "errorCode" | "httpStatus" | "latencyMs"
> & {
  ip?: unknown;
  capturedAt?: string;
  queueWaitMs?: number;
  networkMs?: number;
  totalMs?: number;
};

export function diagnosticResult(
  context: DiagnosticContext,
  fields: ResultFields,
  receivedAt = new Date().toISOString(),
): DiagnosticResult {
  const normalized = normalizePublicIp(fields.ip);
  const status =
    fields.status === "ok" && !normalized ? "invalid" : fields.status;
  const errorCode =
    fields.status === "ok" && !normalized ? "invalid_ip" : fields.errorCode;
  return {
    schemaVersion: 1,
    ...context,
    ip: normalized?.ip,
    version: normalized?.version,
    rawIp: typeof fields.ip === "string" ? fields.ip.trim() : undefined,
    status,
    errorCode,
    httpStatus: fields.httpStatus,
    latencyMs: fields.latencyMs,
    queueWaitMs: fields.queueWaitMs,
    networkMs: fields.networkMs,
    totalMs: fields.totalMs,
    capturedAt: fields.capturedAt,
    receivedAt,
  };
}

function validTimestamp(value: string | undefined) {
  if (!value) return;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : undefined;
}

function latestBySource(results: DiagnosticResult[]) {
  const latest = new Map<string, DiagnosticResult>();
  for (const result of results) {
    const previous = latest.get(result.sourceId);
    const currentTime = validTimestamp(result.capturedAt) ?? -Infinity;
    const previousTime = validTimestamp(previous?.capturedAt) ?? -Infinity;
    if (!previous || currentTime >= previousTime || currentTime === -Infinity)
      latest.set(result.sourceId, result);
  }
  return [...latest.values()];
}

export function aggregateIpObservations(
  results: DiagnosticResult[],
  providerFamilyBySource: ReadonlyMap<string, string> = new Map(),
): IpObservationGroup[] {
  const attempts = results.filter(
    (result) =>
      result.subject === "caller-egress" &&
      result.runtime !== "app" &&
      result.status !== "unsupported" &&
      result.status !== "cancelled",
  );
  const successful = latestBySource(attempts).filter(
    (result) =>
      result.status === "ok" &&
      result.provenance === "observed" &&
      result.ip &&
      result.version,
  );
  const successfulCounts = new Map<string, number>();
  for (const result of successful) {
    const key = `${result.runtime}:${result.version}`;
    successfulCounts.set(key, (successfulCounts.get(key) ?? 0) + 1);
  }
  const attemptCounts = new Map<string, number>();
  for (const result of attempts) {
    const key = `${result.runtime}:${result.version ?? "unknown"}`;
    attemptCounts.set(key, (attemptCounts.get(key) ?? 0) + 1);
  }
  const grouped = new Map<string, DiagnosticResult[]>();
  for (const result of successful) {
    const key = `${result.runtime}:${result.version}:${result.ip}`;
    grouped.set(key, [...(grouped.get(key) ?? []), result]);
  }
  return [...grouped.entries()]
    .map(([key, group]) => {
      const [runtime, version, ...ipParts] = key.split(":");
      const sourceIds = [
        ...new Set(group.map((result) => result.sourceId)),
      ].sort();
      const families = new Set<string>();
      let unknownProviderCount = 0;
      for (const sourceId of sourceIds) {
        const family = providerFamilyBySource.get(sourceId);
        if (family) families.add(family);
        else unknownProviderCount += 1;
      }
      const attemptCount =
        attemptCounts.get(`${runtime}:${version}`) ?? group.length;
      return {
        runtime: runtime as DiagnosticResult["runtime"],
        version: Number(version) as IpVersion,
        ip: ipParts.join(":"),
        sourceIds,
        providerFamilies: [...families].sort(),
        unknownProviderCount,
        successCount: sourceIds.length,
        attemptCount,
        consistency:
          (successfulCounts.get(`${runtime}:${version}`) ?? 0) > 0
            ? sourceIds.length /
              (successfulCounts.get(`${runtime}:${version}`) ?? 1)
            : null,
      };
    })
    .sort(
      (a, b) =>
        a.runtime.localeCompare(b.runtime) ||
        a.version - b.version ||
        a.ip.localeCompare(b.ip),
    );
}

export function compareRuntimeResults(
  browserResults: DiagnosticResult[],
  terminalResults: DiagnosticResult[],
  maxSkewMs = 5 * 60 * 1000,
): RuntimeComparison[] {
  const browser = latestBySource(
    browserResults.filter(
      (result) =>
        result.runtime === "browser" && result.subject === "caller-egress",
    ),
  ).filter(
    (result) => result.status === "ok" && result.ip && result.capturedAt,
  );
  const terminal = latestBySource(
    terminalResults.filter(
      (result) =>
        result.runtime === "terminal" && result.subject === "caller-egress",
    ),
  ).filter(
    (result) => result.status === "ok" && result.ip && result.capturedAt,
  );
  const bySource = new Map(terminal.map((result) => [result.sourceId, result]));
  return browser.flatMap((browserResult) => {
    const terminalResult = bySource.get(browserResult.sourceId);
    if (!terminalResult) return [];
    const browserTime = validTimestamp(browserResult.capturedAt);
    const terminalTime = validTimestamp(terminalResult.capturedAt);
    if (
      browserTime === undefined ||
      terminalTime === undefined ||
      Math.abs(browserTime - terminalTime) > maxSkewMs
    )
      return [];
    const relation =
      browserResult.version !== terminalResult.version
        ? "protocol-different"
        : browserResult.ip === terminalResult.ip
          ? "same"
          : "different";
    return [
      {
        sourceId: browserResult.sourceId,
        browser: browserResult,
        terminal: terminalResult,
        relation,
        userProvided:
          !terminalResult.verified || terminalResult.provenance !== "observed",
      },
    ];
  });
}

function parseIpv4(value: string) {
  const parts = value.split(".");
  if (parts.length !== 4 || !parts.every((part) => /^\d{1,3}$/.test(part)))
    return;
  const numbers = parts.map(Number);
  if (numbers.some((part) => part > 255)) return;
  return numbers;
}

function parseIpv6(value: string) {
  if (value.includes("%")) return;
  const compression = value.indexOf("::");
  if (compression !== -1 && value.indexOf("::", compression + 2) !== -1) return;
  const leftText = compression === -1 ? value : value.slice(0, compression);
  const rightText = compression === -1 ? "" : value.slice(compression + 2);
  const left = leftText ? leftText.split(":") : [];
  const right = rightText ? rightText.split(":") : [];
  const all = [...left, ...right];
  const embeddedIndex = all.findIndex((part) => part.includes("."));
  if (
    embeddedIndex !== -1 &&
    (embeddedIndex !== all.length - 1 ||
      (compression !== -1 && embeddedIndex < left.length))
  )
    return;
  const expandEmbedded = (part: string) => {
    const ipv4 = parseIpv4(part);
    return ipv4
      ? [ipv4[0] * 256 + ipv4[1], ipv4[2] * 256 + ipv4[3]]
      : undefined;
  };
  const parseParts = (parts: string[]) => {
    const numbers: number[] = [];
    for (const part of parts) {
      if (part.includes(".")) {
        const embedded = expandEmbedded(part);
        if (!embedded) return;
        numbers.push(...embedded);
        continue;
      }
      if (!/^[\da-f]{1,4}$/i.test(part)) return;
      const hextet = Number.parseInt(part, 16);
      if (!Number.isInteger(hextet) || hextet < 0 || hextet > 0xffff) return;
      numbers.push(hextet);
    }
    return numbers;
  };
  const leftNumbers = parseParts(left);
  const rightNumbers = parseParts(right);
  if (!leftNumbers || !rightNumbers) return;
  const numbers = [...leftNumbers, ...rightNumbers];
  if (compression === -1) {
    if (numbers.length !== 8) return;
  } else {
    const omitted = 8 - numbers.length;
    if (omitted < 1) return;
    numbers.splice(
      leftNumbers.length,
      0,
      ...Array.from({ length: omitted }, () => 0),
    );
  }
  return numbers;
}

function bytesFromHextets(hextets: number[]) {
  return hextets.flatMap((part) => [part >> 8, part & 0xff]);
}

function mappedIpv4(hextets: number[]) {
  if (
    hextets.length === 8 &&
    hextets.slice(0, 5).every((part) => part === 0) &&
    hextets[5] === 0xffff
  ) {
    const bytes = bytesFromHextets(hextets.slice(6));
    return bytes.slice(0, 4).join(".");
  }
}

function formatIpv6(hextets: number[]) {
  let bestStart = -1;
  let bestLength = 1;
  for (let index = 0; index < hextets.length;) {
    if (hextets[index] !== 0) {
      index += 1;
      continue;
    }
    const start = index;
    while (index < hextets.length && hextets[index] === 0) index += 1;
    if (index - start > bestLength) {
      bestStart = start;
      bestLength = index - start;
    }
  }
  if (bestStart === -1)
    return hextets.map((part) => part.toString(16)).join(":");
  const left = hextets
    .slice(0, bestStart)
    .map((part) => part.toString(16))
    .join(":");
  const right = hextets
    .slice(bestStart + bestLength)
    .map((part) => part.toString(16))
    .join(":");
  return `${left}::${right}`;
}

export function normalizeIp(value: unknown): NormalizedIp | undefined {
  if (typeof value !== "string") return;
  const rawIp = value.trim();
  if (!rawIp || rawIp.startsWith("[") !== rawIp.endsWith("]")) return;
  const ip = rawIp.startsWith("[") ? rawIp.slice(1, -1) : rawIp;
  const ipv4 = parseIpv4(ip);
  if (ipv4) return { ip: ipv4.join("."), rawIp, version: 4 };
  const hextets = parseIpv6(ip);
  if (!hextets) return;
  const mapped = mappedIpv4(hextets);
  return mapped
    ? { ip: mapped, rawIp, version: 4 }
    : { ip: formatIpv6(hextets), rawIp, version: 6 };
}

function inRange(value: number, start: number, end: number) {
  return value >= start && value <= end;
}

function isPrivateIpv4(ip: string) {
  const parts = parseIpv4(ip);
  if (!parts) return true;
  const [a, b] = parts;
  const value = parts.reduce((total, part) => total * 256 + part, 0);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && inRange(b, 64, 127)) ||
    (a === 169 && b === 254) ||
    (a === 172 && inRange(b, 16, 31)) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && parts[2] === 0) ||
    (a === 192 && b === 0 && parts[2] === 2) ||
    (a === 198 && inRange(b, 18, 19)) ||
    (a === 198 && b === 51 && parts[2] === 100) ||
    (a === 203 && b === 0 && parts[2] === 113) ||
    value >= 0xe0000000
  );
}

function isPrivateIpv6(hextets: number[]) {
  const first = hextets[0];
  return (
    hextets.every((part) => part === 0) ||
    (hextets.slice(0, 7).every((part) => part === 0) && hextets[7] === 1) ||
    (first & 0xfe00) === 0xfc00 ||
    (first & 0xffc0) === 0xfe80 ||
    (first & 0xff00) === 0xff00 ||
    (hextets[0] === 0x2001 && hextets[1] === 0x0db8) ||
    (hextets[0] === 0x2001 && hextets[1] === 0x0002)
  );
}

export function isPublicIp(value: unknown) {
  const normalized = normalizeIp(value);
  if (!normalized) return false;
  if (normalized.version === 4) return !isPrivateIpv4(normalized.ip);
  const hextets = parseIpv6(normalized.ip);
  return Boolean(hextets && !isPrivateIpv6(hextets));
}

export function normalizePublicIp(value: unknown) {
  const normalized = normalizeIp(value);
  return normalized && isPublicIp(normalized.ip) ? normalized : undefined;
}

export function classifyDiagnosticError(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "AbortError")
    return { status: "cancelled" as const, errorCode: "aborted" as const };
  if (name === "TimeoutError")
    return { status: "timeout" as const, errorCode: "timeout" as const };
  const httpStatus =
    error && typeof error === "object" && "httpStatus" in error
      ? (error as { httpStatus?: unknown }).httpStatus
      : undefined;
  if (typeof httpStatus === "number" && Number.isInteger(httpStatus)) {
    return httpStatus === 429
      ? {
          status: "rate_limited" as const,
          errorCode: "rate_limit" as const,
          httpStatus,
        }
      : {
          status: "http_error" as const,
          errorCode: "http" as const,
          httpStatus,
        };
  }
  return { status: "network_error" as const };
}
