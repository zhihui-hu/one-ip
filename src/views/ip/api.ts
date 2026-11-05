import { t } from "@/i18n";
import { sameIp } from "@/lib/ip-address";
import { endpoint, request } from "@/lib/network";
import type { Geo, Lookup } from "@/lib/types";
import { adaptCoffee, coffeeIpSchema, type CoffeeLookup } from "./coffee.ts";
import type { IpNetwork } from "./route-graph/types.ts";

/** Budget for the direct Net.Coffee call before falling back to the same-origin API. */
const COFFEE_TIMEOUT_MS = 5000;

export async function lookupIp(ip: string, signal?: AbortSignal) {
  const data = await request<unknown>(
    `https://ip.net.coffee/api/ip/lookup/${encodeURIComponent(ip)}`,
    { signal, mode: "cors", credentials: "omit", cache: "no-store" },
  );
  const result = coffeeIpSchema.safeParse(data);
  if (!result.success)
    throw new Error(t("api.theIpLocationSourceReturnedNoValidResult"));
  if (!sameIp(result.data.ip, ip))
    throw new Error(t("ip.ipReturnedSourceDoesMatchRequestedAddress"));
  return adaptCoffee(result.data);
}

/** Same-origin lookup for visitors whose network cannot reach Net.Coffee (e.g. mainland China). */
export async function lookupIpViaServer(
  ip: string,
  signal?: AbortSignal,
): Promise<CoffeeLookup> {
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
  const coffee = coffeeIpSchema.parse({
    ip,
    country: geo.country,
    countryCode: geo.country_code,
    region: geo.region,
    city: geo.city,
    isp: geo.isp,
    asn: typeof geo.asn === "number" ? geo.asn : undefined,
  });
  return {
    coffee,
    geo,
    sources,
    rdap: data.rdap,
    risk: { available: false, reason: t("ip.primarySourceUnavailable") },
    fallback: true,
  };
}

/** Prefer Net.Coffee; degrade to the same-origin API when it is blocked or slow. */
export async function lookupIpWithFallback(ip: string, signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(COFFEE_TIMEOUT_MS);
  try {
    return await lookupIp(
      ip,
      signal ? AbortSignal.any([signal, timeout]) : timeout,
    );
  } catch (error) {
    signal?.throwIfAborted();
    try {
      return await lookupIpViaServer(ip, signal);
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
