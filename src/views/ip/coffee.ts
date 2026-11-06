import type { Geo, Lookup } from "@/lib/types";
import { z } from "zod";

// Optional provider values stay unknown when absent or malformed; never coerce flags.
const optionalText = z
  .string()
  .nullish()
  .catch(undefined)
  .transform((value) => value ?? undefined);
const optionalNumber = z
  .number()
  .finite()
  .nullish()
  .catch(undefined)
  .transform((value) => value ?? undefined);
const optionalFlag = z
  .boolean()
  .nullish()
  .catch(undefined)
  .transform((value) => value ?? undefined);

export const coffeeIpSchema = z
  .object({
    registered_country_code: optionalText,
    registered_country: optionalText,
    is_public_service: optionalFlag,
    datacenter_name: optionalText,
    reddit_blocked: optionalFlag,
    vpn_trace: z.unknown().optional(),
    ai_verdict: z
      .object({
        label: optionalText,
        confidence: optionalNumber,
        reasoning: optionalText,
      })
      .nullish()
      .transform((value) => value ?? undefined),
    location_history: z
      .array(
        z.object({
          country: optionalText,
          region: optionalText,
          city: optionalText,
          seen_at: optionalNumber,
        }),
      )
      .nullish()
      .transform((value) => value ?? undefined),
    asn_history: z
      .array(
        z.object({
          asn: optionalNumber,
          asn_org: optionalText,
          seen_at: optionalNumber,
        }),
      )
      .nullish()
      .transform((value) => value ?? undefined),
    company_history: z
      .array(
        z.object({
          company_name: optionalText,
          company_type: optionalText,
          seen_at: optionalNumber,
        }),
      )
      .nullish()
      .transform((value) => value ?? undefined),
    dc_neighbors: z
      .array(
        z.object({
          ip: z.string(),
          country_code: optionalText,
          city: optionalText,
          company: optionalText,
          seen_at: optionalNumber,
        }),
      )
      .nullish()
      .transform((value) => value ?? undefined),
    ip: z.string(),
    cidr: optionalText,
    trust_score: optionalNumber,
    country: optionalText,
    countryCode: optionalText,
    region: optionalText,
    city: optionalText,
    isp: optionalText,
    is_bogon: optionalFlag,
    is_datacenter: optionalFlag,
    isResidential: optionalFlag,
    is_vpn: optionalFlag,
    is_proxy: optionalFlag,
    is_tor: optionalFlag,
    is_crawler: optionalFlag,
    is_abuser: optionalFlag,
    is_mobile: optionalFlag,
    company_type: optionalText,
    company_name: optionalText,
    abuser_score: optionalText,
    asn: optionalNumber,
    asOrganization: optionalText,
    asname: optionalText,
    rdns: optionalText,
    range: z
      .object({
        first: optionalText,
        last: optionalText,
        count: optionalNumber,
        prefix: optionalNumber,
      })
      .nullish()
      .transform((value) => value ?? undefined),
    asn_kind: optionalText,
    rpki_status: optionalText,
    asn_tbps: optionalText,
    asn_ipv4_count: optionalNumber,
    asn_allocated: optionalText,
    geo_sources: z
      .array(
        z.object({
          src: optionalText,
          country: optionalText,
          country_code: optionalText,
          region: optionalText,
          city: optionalText,
          lat: optionalNumber,
          lon: optionalNumber,
        }),
      )
      .nullish()
      .transform((value) => value ?? undefined),
    intelligence: z
      .object({
        threats: z
          .array(
            z.union([
              z.string(),
              z.object({ label: z.string(), severity: optionalText }),
            ]),
          )
          .nullish()
          .transform((value) => value ?? undefined),
        abuser_level: optionalText,
        abuser_score_raw: optionalText,
        rep_threat: z.unknown().optional(),
      })
      .nullish()
      .transform((value) => value ?? undefined),
    related_domains: z
      .array(
        z.object({
          domain: z.string(),
          via: optionalText,
        }),
      )
      .nullish()
      .transform((value) => value ?? undefined),
  })
  .passthrough();

export type CoffeeIp = z.infer<typeof coffeeIpSchema>;
export interface CoffeeLookup extends Lookup {
  coffee: CoffeeIp;
  /** Set when Net.Coffee was unreachable and only same-origin geo data is shown. */
  fallback?: boolean;
}
export function coffeeThreatLabels(data: CoffeeIp, riskOnly = false): string[] {
  return (data.intelligence?.threats ?? [])
    .filter(
      (threat) =>
        !riskOnly ||
        typeof threat === "string" ||
        threat.severity?.toLowerCase() !== "info",
    )
    .map((threat) => (typeof threat === "string" ? threat : threat.label))
    .filter(
      (label): label is string =>
        typeof label === "string" && label.trim().length > 0,
    )
    .map((label) => label.trim());
}
export function adaptCoffee(data: CoffeeIp): CoffeeLookup {
  const sources: Geo[] = (data.geo_sources ?? []).map((g) => ({
    ip: data.ip,
    source: `Net.Coffee / ${g.src ?? "—"}`,
    country: g.country,
    country_code: g.country_code,
    region: g.region,
    city: g.city,
    latitude:
      typeof g.lat === "number" &&
      Number.isFinite(g.lat) &&
      Math.abs(g.lat) <= 90
        ? g.lat
        : undefined,
    longitude:
      typeof g.lon === "number" &&
      Number.isFinite(g.lon) &&
      Math.abs(g.lon) <= 180
        ? g.lon
        : undefined,
  }));
  const coordinates = sources.find(
    (g) => g.latitude != null && g.longitude != null,
  );
  return {
    coffee: data,
    geo: {
      ip: data.ip,
      country: data.country,
      country_code: data.countryCode,
      region: data.region,
      city: data.city,
      isp: data.isp,
      asn: data.asn,
      latitude: coordinates?.latitude,
      longitude: coordinates?.longitude,
      source: "Net.Coffee",
    },
    sources,
    risk: {
      available: true,
      source: "Net.Coffee",
      vpn: data.is_vpn,
      proxy: data.is_proxy,
      tor: data.is_tor,
      bot_status: data.is_crawler,
      recent_abuse: data.is_abuser,
    },
  };
}
