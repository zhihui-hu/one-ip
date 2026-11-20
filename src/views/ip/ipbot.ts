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

/** One ipbot history period: the /24 block's location and network between two days. */
const historyPeriod = z.object({
  from: optionalText,
  to: optionalText,
  country_code: optionalText,
  region: optionalText,
  city: optionalText,
  asn: optionalNumber,
  organization: optionalText,
});

/** Epoch seconds of an ipbot `YYYY-MM-DD` day (UTC). */
function daySeconds(day?: string) {
  const time = day ? Date.parse(`${day}T00:00:00Z`) : NaN;
  return Number.isFinite(time) ? time / 1000 : undefined;
}

/**
 * Newest-first periods differ in any snapshot field; keeps one row per run of equal
 * values for the fields a table shows, dated by its newest day.
 */
function collapse<T>(rows: T[], key: (row: T) => unknown[]) {
  return rows.filter(
    (row, index) =>
      index === 0 ||
      JSON.stringify(key(row)) !== JSON.stringify(key(rows[index - 1])),
  );
}

/**
 * ipbot `GET /api/ip/profile/{ip}` (proxied by the Worker as `/api/ip/profile/{ip}`).
 * `location_history` and `asn_history` are derived from ipbot's `history` periods.
 */
export const ipbotProfileSchema = z
  .object({
    registered_country_code: optionalText,
    is_public_service: optionalFlag,
    datacenter_name: optionalText,
    history: z
      .array(historyPeriod)
      .nullish()
      .catch(undefined)
      .transform((value) => value ?? undefined),
    ip: z.string(),
    cidr: optionalText,
    trust_score: optionalNumber,
    latitude: optionalNumber,
    longitude: optionalNumber,
    timezone: optionalText,
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
    asn: optionalNumber,
    asOrganization: optionalText,
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
    asn_ipv4_count: optionalNumber,
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
  .passthrough()
  .transform((data) => {
    const periods = data.history ?? [];
    const location_history = collapse(
      periods.map((row) => ({
        country: row.country_code?.toUpperCase(),
        region: row.region,
        city: row.city,
        seen_at: daySeconds(row.to),
      })),
      (row) => [row.country, row.region, row.city],
    );
    const asn_history = collapse(
      periods.map((row) => ({
        asn: row.asn,
        asn_org: row.organization,
        seen_at: daySeconds(row.to),
      })),
      (row) => [row.asn, row.asn_org],
    );
    return {
      ...data,
      registered_country: data.registered_country_code,
      location_history: location_history.length ? location_history : undefined,
      asn_history: asn_history.length ? asn_history : undefined,
    };
  });

export type IpbotProfile = z.infer<typeof ipbotProfileSchema>;
export interface IpbotLookup extends Lookup {
  profile: IpbotProfile;
  /** Set when the full ipbot profile failed and only its location lookup is shown. */
  fallback?: boolean;
}
export function threatLabels(data: IpbotProfile, riskOnly = false): string[] {
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
export function adaptIpbot(data: IpbotProfile): IpbotLookup {
  const sources: Geo[] = (data.geo_sources ?? []).map((g) => ({
    ip: data.ip,
    source: `ipbot / ${g.src ?? "—"}`,
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
  const coordinates =
    data.latitude != null &&
    data.longitude != null &&
    Math.abs(data.latitude) <= 90 &&
    Math.abs(data.longitude) <= 180
      ? { latitude: data.latitude, longitude: data.longitude }
      : sources.find((g) => g.latitude != null && g.longitude != null);
  return {
    profile: data,
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
      timezone: data.timezone,
      source: "ipbot",
    },
    sources,
    risk: {
      available: true,
      source: "ipbot",
      vpn: data.is_vpn,
      proxy: data.is_proxy,
      tor: data.is_tor,
      bot_status: data.is_crawler,
      recent_abuse: data.is_abuser,
    },
  };
}
