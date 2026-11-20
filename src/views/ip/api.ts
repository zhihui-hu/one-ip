import { t } from "@/i18n";
import { sameIp } from "@/lib/ip-address";
import { endpoint } from "@/lib/network";
import type { Geo, Lookup } from "@/lib/types";
import { adaptIpbot, ipbotProfileSchema, type IpbotLookup } from "./ipbot.ts";
import type { IpNetwork } from "./route-graph/types.ts";

/** Full ipbot profile, proxied (and edge-cached) by this site's Worker. */
export async function lookupIp(ip: string, signal?: AbortSignal) {
  const data = await endpoint<unknown>(
    `/ip/profile/${encodeURIComponent(ip)}`,
    { signal },
  );
  const result = ipbotProfileSchema.safeParse(data);
  if (!result.success)
    throw new Error(t("api.theIpLocationSourceReturnedNoValidResult"));
  if (!sameIp(result.data.ip, ip))
    throw new Error(t("ip.ipReturnedSourceDoesMatchRequestedAddress"));
  return adaptIpbot(result.data);
}

/** Location-only ipbot lookup, used when the full profile is busy or failed. */
export async function lookupIpLocation(
  ip: string,
  signal?: AbortSignal,
): Promise<IpbotLookup> {
  const data = await endpoint<Partial<Lookup>>(
    `/ip/lookup/${encodeURIComponent(ip)}`,
    { signal },
  );
  const geo: Geo = { ...data.geo, ip };
  const sources = (data.sources ?? []).filter((source) =>
    sameIp(source.ip, ip),
  );
  if (!sources.length)
    throw new Error(t("api.theIpLocationSourceReturnedNoValidResult"));
  const profile = ipbotProfileSchema.parse({
    ip,
    country: geo.country,
    countryCode: geo.country_code,
    region: geo.region,
    city: geo.city,
    isp: geo.isp,
    asn: typeof geo.asn === "number" ? geo.asn : undefined,
  });
  return {
    profile,
    geo,
    sources,
    rdap: data.rdap,
    risk: { available: false, reason: t("ip.primarySourceUnavailable") },
    fallback: true,
  };
}

/** Prefer the full profile; degrade to the location lookup when it fails. */
export async function lookupIpWithFallback(ip: string, signal?: AbortSignal) {
  try {
    return await lookupIp(ip, signal);
  } catch (error) {
    signal?.throwIfAborted();
    try {
      return await lookupIpLocation(ip, signal);
    } catch {
      signal?.throwIfAborted();
      throw error;
    }
  }
}

export const currentIp = (signal?: AbortSignal) =>
  endpoint<Geo>("/me", { signal });

export const ipNetwork = (ip: string, signal?: AbortSignal) =>
  endpoint<IpNetwork>(`/ip/network/${encodeURIComponent(ip)}`, { signal });
