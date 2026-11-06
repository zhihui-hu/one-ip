import { t } from "@/i18n";
import { normalizeIp, sameIp } from "@/lib/ip-address";
import { localizeCatalogItem } from "@/lib/localize-catalog";
import { endpoint, probe, request, trace } from "@/lib/network";
import type { Geo } from "@/lib/types";

export const getMyIp = (signal?: AbortSignal) =>
  endpoint<Geo>("/me", { signal });
/** Location for an IP: browser-direct providers first, then the same-origin API. */
export async function getGeo(
  ip: string,
  signal?: AbortSignal,
  timeoutMs = 3000,
): Promise<Geo> {
  // Each provider gets its own budget so one blocked host (common from
  // mainland China) cannot starve the others.
  const scoped = () => {
    const timeout = AbortSignal.timeout(timeoutMs);
    return signal ? AbortSignal.any([signal, timeout]) : timeout;
  };
  try {
    return await Promise.any([
      geoFromIpQuery(ip, scoped()),
      geoFromIpWhoIs(ip, scoped()),
    ]);
  } catch {
    signal?.throwIfAborted();
  }
  try {
    const data = await endpoint<Geo>(`/geoip/${encodeURIComponent(ip)}`, {
      signal: scoped(),
    });
    if (!sameIp(data?.ip, ip) || (!data.country && !data.isp))
      throw new Error(t("home.incompleteLocationInformation"));
    return { ...data, ip };
  } catch {
    signal?.throwIfAborted();
    throw new Error(t("home.locationDetailsAreUnavailablePleaseRetryLater"));
  }
}
async function geoFromIpQuery(ip: string, signal: AbortSignal): Promise<Geo> {
  // api.ip.sb/geoip is blocked for third-party sites by AdGuard Tracking
  // Protection, so the browser uses ipquery.io instead.
  const data = await request<{
    ip?: string;
    isp?: { asn?: string; org?: string; isp?: string };
    location?: {
      country?: string;
      country_code?: string;
      state?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
      timezone?: string;
    };
  }>(`https://api.ipquery.io/${encodeURIComponent(ip)}?format=json`, {
    signal,
  });
  const location = data?.location;
  const isp = data?.isp?.isp || data?.isp?.org;
  if (!sameIp(data?.ip, ip) || (!location?.country && !isp))
    throw new Error(t("home.incompleteLocationInformation"));
  const asn = Number(data.isp?.asn?.replace(/^AS/i, ""));
  return {
    ip,
    country: location?.country,
    country_code: location?.country_code,
    region: location?.state,
    city: location?.city,
    isp,
    asn: Number.isFinite(asn) && asn > 0 ? asn : undefined,
    latitude: location?.latitude,
    longitude: location?.longitude,
    timezone: location?.timezone,
    source: "ipquery.io",
  };
}
async function geoFromIpWhoIs(ip: string, signal: AbortSignal): Promise<Geo> {
  const data = await request<{
    ip?: string;
    success: boolean;
    country?: string;
    country_code?: string;
    region?: string;
    city?: string;
    connection?: { isp?: string; asn?: number };
    latitude?: number;
    longitude?: number;
    timezone?: { id?: string };
  }>(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal });
  if (data?.success !== true || !sameIp(data.ip, ip))
    throw new Error(t("home.locationDetailsAreUnavailablePleaseRetryLater"));
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

/**
 * IP seen by overseas sites. ipify alone is often slow or blocked from
 * mainland China (or sent direct by split rules), which used to hide the
 * overseas card even though the proxy worked. Cloudflare traces on overseas
 * sites act as fallbacks; sources run in parallel and the earliest source in
 * this list that answers wins, so the result stays stable between runs.
 */
export async function getOverseasIp(signal?: AbortSignal): Promise<Geo> {
  // The card is labelled IPv4, so dual-stack traces must answer over IPv4;
  // 1.1.1.1 is IPv4-only and comes last because rules often send it direct.
  const ipv4Trace = async (domain: string) => {
    const geo = await trace(domain, signal);
    if (geo.ip.includes(":")) throw new Error(t("home.noValidIpObtained"));
    return geo;
  };
  const attempts: Promise<Geo>[] = [
    getBrowserIp(4, signal),
    ipv4Trace("chatgpt.com"),
    ipv4Trace("www.cloudflare.com"),
    ipv4Trace("1.1.1.1"),
  ];
  // Settle every attempt so later rejections are never unhandled.
  attempts.forEach((attempt) => attempt.catch(() => undefined));
  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return await attempt;
    } catch (error) {
      signal?.throwIfAborted();
      lastError = error;
    }
  }
  throw lastError;
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
  const ip = normalizeIp(data?.ip);
  if (!ip || (version === 6) !== ip.includes(":"))
    throw new Error(t("home.noValidIpObtained"));
  return { ip, source: "ipify" };
}
