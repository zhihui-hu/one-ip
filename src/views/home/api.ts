import { t } from "@/i18n";
import { normalizeIp, sameIp } from "@/lib/ip-address";
import { localizeCatalogItem } from "@/lib/localize-catalog";
import { endpoint, probe, request, trace } from "@/lib/network";
import type { Geo } from "@/lib/types";

export const getMyIp = (signal?: AbortSignal) =>
  endpoint<Geo>("/me", { signal });
/** Location for an IP from ipbot, through this site's Worker. */
export async function getGeo(
  ip: string,
  signal?: AbortSignal,
  timeoutMs = 5000,
): Promise<Geo> {
  const timeout = AbortSignal.timeout(timeoutMs);
  try {
    const data = await endpoint<Geo>(`/geoip/${encodeURIComponent(ip)}`, {
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!sameIp(data?.ip, ip) || (!data.country && !data.isp))
      throw new Error(t("home.incompleteLocationInformation"));
    return { ...data, ip };
  } catch {
    signal?.throwIfAborted();
    throw new Error(t("home.locationDetailsAreUnavailablePleaseRetryLater"));
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
  throw new Error(t("home.chinaEgressUnknownTargetSiteMayRestrictCross"));
}
export interface Site {
  nameKey?: string;
  note?: string;
  noteKey?: string;
  extra?: string[];
  name: string;
  type: string;
  method: string;
  domain?: string;
  url?: string;
  icon: string;
}
const fallbackSiteProbeUrl =
  "https://necaptcha.nosdn.127.net/ab7f4275c1744aa28e0a8f3a1c58c532.png";

export function siteProbeUrl(site: Pick<Site, "domain" | "url">) {
  return site.domain
    ? `https://${site.domain}/`
    : (site.url ?? fallbackSiteProbeUrl);
}

export async function probeSite(site: Site, signal?: AbortSignal) {
  return (await probe(siteProbeUrl(site), signal)) >= 0;
}

export interface SiteInspection {
  geo?: Geo;
  reachable: boolean;
}

export async function inspectSite(
  site: Site,
  signal?: AbortSignal,
): Promise<SiteInspection> {
  if (site.method === "unsupported")
    return { reachable: await probeSite(site, signal) };
  try {
    return { geo: await detectSite(site, signal), reachable: true };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { reachable: await probeSite(site, signal) };
  }
}

async function detectSite(site: Site, signal?: AbortSignal): Promise<Geo> {
  if (site.method === "unsupported")
    throw new Error(
      localizeCatalogItem(site).note ?? t("home.noReadableEgressIpObtained"),
    );
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
    const address = normalizeIp(ip);
    if (!address) throw new Error(t("home.noReadableEgressIpObtained"));
    geo = { ip: address, source: site.name };
  } else {
    const headers = await request<Headers>(
      site.url ?? fallbackSiteProbeUrl,
      { method: "HEAD", cache: "no-store", signal },
      "headers",
    );
    const ip =
      headers.get("cdn-user-ip") ??
      headers.get("x-request-ip") ??
      headers.get("x-response-cinfo");
    const address = normalizeIp(ip);
    if (!address) throw new Error(t("home.noReadableEgressIpObtained"));
    geo = { ip: address, source: site.name };
  }
  return geo;
}

/** IPv4 exit seen by overseas sites, from ipbot. */
export const getOverseasIp = (signal?: AbortSignal) => getBrowserIp(4, signal);

/**
 * ipbot's `/api/me` echo. `api4` has only an A record (DNS-only), so it
 * always answers over IPv4. `api` sits behind Cloudflare, whose edge is
 * dual-stack, so visitors with IPv6 usually reach it over IPv6; it counts
 * only when it answers over the requested family. The origin has no IPv6,
 * so there is no IPv6-only host.
 */
const IPBOT_ECHO = {
  4: ["https://api4.ipbot.net", "https://api.ipbot.net"],
  6: ["https://api.ipbot.net"],
} as const;

export async function getBrowserIp(
  version: 4 | 6,
  signal?: AbortSignal,
): Promise<Geo> {
  const scoped = () =>
    signal
      ? AbortSignal.any([signal, AbortSignal.timeout(3000)])
      : AbortSignal.timeout(3000);
  const attempts = IPBOT_ECHO[version].map(async (origin) => {
    const data = await request<{ ip?: string }>(`${origin}/api/me`, {
      signal: scoped(),
      cache: "no-store",
      credentials: "omit",
    });
    const ip = normalizeIp(data?.ip);
    if (!ip || (version === 6) !== ip.includes(":"))
      throw new Error(t("home.noValidIpObtained"));
    return { ip, source: "ipbot" } satisfies Geo;
  });
  try {
    return await Promise.any(attempts);
  } catch {
    signal?.throwIfAborted();
    throw new Error(t("home.noValidIpObtained"));
  }
}
