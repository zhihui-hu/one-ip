import { t } from "@/i18n";
import { endpoint, request, trace } from "@/lib/network";
import type { Geo } from "@/lib/types";

export const getMyIp = (signal?: AbortSignal) =>
  endpoint<Geo>("/me", { signal });
export async function getGeo(
  ip: string,
  signal?: AbortSignal,
  timeoutMs = 3000,
): Promise<Geo> {
  const timeout = AbortSignal.timeout(timeoutMs);
  signal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const options = () => ({ signal });
  try {
    const data = await request<Geo>(
      `https://api.ip.sb/geoip/${encodeURIComponent(ip)}`,
      options(),
    );
    if (!data.ip || (!data.country && !data.isp))
      throw new Error(t("归属信息不完整"));
    return { ...data, ip, source: "ip.sb" };
  } catch {
    signal?.throwIfAborted();
    const data = await request<{
      success: boolean;
      country?: string;
      country_code?: string;
      region?: string;
      city?: string;
      connection?: { isp?: string; asn?: number };
      latitude?: number;
      longitude?: number;
      timezone?: { id?: string };
    }>(`https://ipwho.is/${encodeURIComponent(ip)}`, options());
    if (!data.success) throw new Error(t("归属信息暂不可用，请稍后重试"));
    return {
      ip,
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
export async function getDomesticIp(signal?: AbortSignal): Promise<Geo> {
  const timeout = AbortSignal.timeout(3000);
  signal = signal ? AbortSignal.any([signal, timeout]) : timeout;
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
    try {
      const headers = await request<Headers>(
        source.url,
        {
          method: "HEAD",
          mode: "cors",
          credentials: "omit",
          redirect: "error",
          cache: "no-store",
          signal,
        },
        "headers",
      );
      const ip = headers.get(source.header)?.trim();
      if (
        ip &&
        /^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip) &&
        ip.split(".").every((part) => Number(part) <= 255)
      )
        return { ip, source: new URL(source.url).hostname };
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }
  throw new Error(t("国内出口未知：目标站点可能限制跨域读取"));
}
export interface Site {
  extra?: string[];
  name: string;
  type: string;
  method: string;
  domain?: string;
  url?: string;
  icon: string;
}
export async function detectSite(
  site: Site,
  signal?: AbortSignal,
): Promise<Geo> {
  signal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(3000)])
    : AbortSignal.timeout(3000);
  signal.throwIfAborted();
  let geo: Geo;
  if (site.method === "cftrace" && site.domain)
    geo = await trace(site.domain, signal);
  else if (
    (site.method === "ip-text" || site.method === "ip-json") &&
    site.url
  ) {
    let ip: string | undefined;
    if (site.method === "ip-json") {
      const data = await request<{ ip?: string }>(site.url, {
        signal,
        cache: "no-store",
      });
      ip = data.ip;
    } else {
      const html = await request<string>(
        site.url,
        { signal, cache: "no-store" },
        "text",
      );
      const text = html.replace(/<[^>]*>/g, " ");
      ip = text.match(
        /(?:IP(?:地址)?|ip)[^\d]{0,30}((?:\d{1,3}\.){3}\d{1,3})/i,
      )?.[1];
    }
    if (!ip || !/^[\da-fA-F:.]+$/.test(ip))
      throw new Error(t("未获取到可读取的出口 IP"));
    geo = { ip, source: site.name };
  } else {
    const url =
      site.url ??
      "https://necaptcha.nosdn.127.net/ab7f4275c1744aa28e0a8f3a1c58c532.png";
    const headers = await request<Headers>(
      url,
      { method: "HEAD", cache: "no-store", signal },
      "headers",
    );
    const ip =
      headers.get("cdn-user-ip") ??
      headers.get("x-request-ip") ??
      headers.get("x-response-cinfo");
    if (!ip || !/^[\da-fA-F:.]+$/.test(ip))
      throw new Error(t("未获取到可读取的出口 IP"));
    geo = { ip, source: site.name };
  }
  return geo;
}

export async function getBrowserIp(
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
  if (
    !data.ip ||
    (version === 6
      ? !data.ip.includes(":")
      : !/^\d{1,3}(\.\d{1,3}){3}$/.test(data.ip))
  )
    throw new Error(t("未获取到有效 IP"));
  return { ip: data.ip, source: "ipify" };
}
