import { endpoint, request, trace } from "@/lib/network";
import type { Geo } from "@/lib/types";

export const getMyIp = (signal?: AbortSignal) =>
  endpoint<Geo>("/me", { signal });
export const getGeo = (ip: string, signal?: AbortSignal) =>
  endpoint<Geo>(`/geoip/${encodeURIComponent(ip)}`, { signal });
export async function getDomesticIp(signal?: AbortSignal): Promise<Geo> {
  for (const url of ["https://2026.ip138.com/", "https://my.ip.cn/"]) {
    try {
      const text = await request<string>(
        url,
        {
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(5000)])
            : AbortSignal.timeout(5000),
        },
        "text",
      );
      const match = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
      if (match) return { ip: match[0], source: new URL(url).hostname };
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }
  throw new Error("国内出口未知：目标站点可能限制跨域读取");
}
export interface Site {
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
  let geo: Geo;
  if (site.method === "cftrace" && site.domain)
    geo = await trace(site.domain, signal);
  else {
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
      throw new Error("未获取到可读取的出口 IP");
    geo = { ip, source: site.name };
  }
  try {
    return { ...geo, ...(await getGeo(geo.ip, signal)) };
  } catch (error) {
    if (signal?.aborted) throw error;
    return geo;
  }
}
