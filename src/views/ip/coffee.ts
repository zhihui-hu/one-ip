import type { Geo, Lookup } from "@/lib/types";

export interface CoffeeIp {
  registered_country_code?: string;
  registered_country?: string;
  is_public_service?: boolean;
  datacenter_name?: string;
  reddit_blocked?: boolean;
  vpn_trace?: unknown;
  ai_verdict?: { label?: string; confidence?: number; reasoning?: string };
  location_history?: {
    country?: string;
    region?: string;
    city?: string;
    seen_at?: number;
  }[];
  asn_history?: { asn?: number; asn_org?: string; seen_at?: number }[];
  company_history?: {
    company_name?: string;
    company_type?: string;
    seen_at?: number;
  }[];
  dc_neighbors?: {
    ip: string;
    country_code?: string;
    city?: string;
    company?: string;
    seen_at?: number;
  }[];
  ip: string;
  cidr?: string;
  trust_score?: number;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  isp?: string;
  is_bogon?: boolean;
  is_datacenter?: boolean;
  isResidential?: boolean;
  is_vpn?: boolean;
  is_proxy?: boolean;
  is_tor?: boolean;
  is_crawler?: boolean;
  is_abuser?: boolean;
  is_mobile?: boolean;
  company_type?: string;
  company_name?: string;
  abuser_score?: string;
  asn?: number;
  asOrganization?: string;
  asname?: string;
  rdns?: string;
  range?: { first?: string; last?: string; count?: number; prefix?: number };
  asn_kind?: string;
  rpki_status?: string;
  asn_tbps?: string;
  asn_ipv4_count?: number;
  asn_allocated?: string;
  geo_sources?: {
    src?: string;
    country?: string;
    country_code?: string;
    region?: string;
    city?: string;
    lat?: number | null;
    lon?: number | null;
  }[];
  intelligence?: {
    threats?: string[];
    abuser_level?: string;
    abuser_score_raw?: string;
    rep_threat?: unknown;
  };
  related_domains?: { domain: string; via?: string }[];
}
export interface CoffeeLookup extends Lookup {
  coffee: CoffeeIp;
}
export function adaptCoffee(data: CoffeeIp): CoffeeLookup {
  const sources: Geo[] = (data.geo_sources ?? []).map((g) => ({
    ip: data.ip,
    source: `Net.Coffee / ${g.src ?? "—"}`,
    country: g.country,
    country_code: g.country_code,
    region: g.region,
    city: g.city,
    latitude: typeof g.lat === "number" ? g.lat : undefined,
    longitude: typeof g.lon === "number" ? g.lon : undefined,
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
