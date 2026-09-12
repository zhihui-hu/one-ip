import { t } from "@/i18n";
import type { SourceDefinition } from "@/lib/diagnostic-source";
import {
  classifyDiagnosticError,
  diagnosticResult,
  type DiagnosticResult,
} from "@/lib/diagnostics";
import { normalizePublicIp } from "@/lib/diagnostics";
import { createConcurrencyLimiter, endpoint, request } from "@/lib/network";
import { executeSource } from "@/lib/source-probe";
import type { Geo } from "@/lib/types";

const diagnosticLimiter = createConcurrencyLimiter(4);
export const getMyIp = (signal?: AbortSignal) =>
  diagnosticLimiter.run(signal, () => endpoint<Geo>("/me", { signal }), 5);

async function getGeoUnbounded(
  ip: string,
  signal?: AbortSignal,
  timeoutMs = 3000,
): Promise<Geo> {
  const target = normalizePublicIp(ip);
  if (!target) throw new Error(t("未获取到有效 IP"));
  const targetIp = target.ip;
  const sourceSignal = () =>
    signal
      ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
      : AbortSignal.timeout(timeoutMs);
  try {
    const data = await request<Geo>(
      `https://api.ip.sb/geoip/${encodeURIComponent(targetIp)}`,
      { signal: sourceSignal() },
    );
    const returned = normalizePublicIp(data.ip);
    if (!returned || returned.ip !== targetIp || (!data.country && !data.isp))
      throw new Error(t("归属信息不完整"));
    return { ...data, ip: targetIp, source: "ip.sb" };
  } catch {
    signal?.throwIfAborted();
    const data = await request<{
      success: boolean;
      ip?: string;
      country?: string;
      country_code?: string;
      region?: string;
      city?: string;
      connection?: { isp?: string; asn?: number };
      latitude?: number;
      longitude?: number;
      timezone?: { id?: string };
    }>(`https://ipwho.is/${encodeURIComponent(targetIp)}`, {
      signal: sourceSignal(),
    });
    if (!data.success) throw new Error(t("归属信息暂不可用，请稍后重试"));
    const returned = normalizePublicIp(data.ip);
    if (!returned || returned.ip !== targetIp)
      throw new Error(t("归属信息不完整"));
    return {
      ip: targetIp,
      country: data.country,
      country_code: data.country_code,
      region: data.region,
      city: data.city,
      isp: data.connection?.isp,
      asn: data.connection?.asn,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone?.id,
      source: "ipwho.is",
    };
  }
}
export function getGeo(ip: string, signal?: AbortSignal, timeoutMs = 3000) {
  return diagnosticLimiter.run(
    signal,
    () => getGeoUnbounded(ip, signal, timeoutMs),
    10,
  );
}
async function getDomesticIpUnbounded(signal?: AbortSignal): Promise<Geo> {
  const sources = [
    {
      url: "https://necaptcha.nosdn.127.net/ab7f4275c1744aa28e0a8f3a1c58c532.png",
      header: "cdn-user-ip",
    },
    {
      url: "https://perfops.byte-test.com/500b-bench.jpg",
      header: "x-request-ip",
    },
  ];
  for (const source of sources) {
    signal?.throwIfAborted();
    const sourceSignal = signal
      ? AbortSignal.any([signal, AbortSignal.timeout(3000)])
      : AbortSignal.timeout(3000);
    try {
      const headers = await request<Headers>(
        source.url,
        {
          method: "HEAD",
          mode: "cors",
          credentials: "omit",
          redirect: "error",
          cache: "no-store",
          signal: sourceSignal,
        },
        "headers",
      );
      const ip = headers.get(source.header)?.trim();
      const normalized = normalizePublicIp(ip);
      if (normalized?.version === 4)
        return { ip: normalized.ip, source: new URL(source.url).hostname };
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }
  throw new Error(t("国内出口未知：目标站点可能限制跨域读取"));
}
export function getDomesticIp(signal?: AbortSignal) {
  return diagnosticLimiter.run(signal, () => getDomesticIpUnbounded(signal), 5);
}
export type Site = SourceDefinition;
export function detectSite(site: Site, signal?: AbortSignal) {
  return diagnosticLimiter.run(signal, () => executeSource(site, signal));
}

export async function detectSiteResult(
  site: Site,
  runId: string,
  signal?: AbortSignal,
): Promise<DiagnosticResult> {
  const queuedAt = performance.now();
  const context = {
    runId,
    sourceId: site.id,
    runtime: "browser" as const,
    execution: "client-request" as const,
    subject: "caller-egress" as const,
    provenance: "observed" as const,
    verified: true,
  };
  signal?.throwIfAborted();
  if (site.execution === "link-only") {
    return diagnosticResult(
      {
        ...context,
        verified: false,
        execution: "link-only",
        provenance: "declared",
      },
      {
        status: "unsupported",
        latencyMs: 0,
        queueWaitMs: 0,
        networkMs: 0,
        totalMs: 0,
        capturedAt: new Date().toISOString(),
      },
    );
  }
  return diagnosticLimiter.run(signal, async () => {
    const startedAt = performance.now();
    const timing = () => {
      const totalMs = Math.round(performance.now() - queuedAt);
      const queueWaitMs = Math.round(startedAt - queuedAt);
      return {
        latencyMs: totalMs,
        queueWaitMs,
        networkMs: totalMs - queueWaitMs,
        totalMs,
        capturedAt: new Date().toISOString(),
      };
    };
    try {
      const geo = await executeSource(site, signal);
      return diagnosticResult(context, {
        status: "ok",
        ip: geo.ip,
        ...timing(),
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      return diagnosticResult(
        { ...context, verified: false },
        { ...classifyDiagnosticError(error), ...timing() },
      );
    }
  });
}

async function getBrowserIpUnbounded(
  version: 4 | 6,
  signal?: AbortSignal,
): Promise<Geo> {
  const data = await request<{ ip: string }>(
    `https://${version === 4 ? "api4" : "api6"}.ipify.org?format=json`,
    {
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(3000)])
        : AbortSignal.timeout(3000),
      cache: "no-store",
    },
  );
  const normalized = normalizePublicIp(data.ip);
  if (!normalized || normalized.version !== version)
    throw new Error(t("未获取到有效 IP"));
  return { ip: normalized.ip, source: "ipify" };
}
export function getBrowserIp(version: 4 | 6, signal?: AbortSignal) {
  return diagnosticLimiter.run(
    signal,
    () => getBrowserIpUnbounded(version, signal),
    5,
  );
}
