export interface Geo {
  ip: string;
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  isp?: string;
  asn?: number | string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  source?: string;
}
export interface Risk {
  available: boolean;
  source?: string;
  reason?: string;
  fraud_score?: number;
  vpn?: boolean;
  proxy?: boolean;
  tor?: boolean;
  bot_status?: boolean;
  recent_abuse?: boolean;
  connection_type?: string;
}
export interface Lookup {
  geo: Geo;
  sources: Geo[];
  risk: Risk;
  rdap?: Record<string, unknown>;
}
export interface RtcResult {
  ip: string;
  type: string;
  public: boolean;
  candidateType?: "host" | "srflx" | "prflx" | "relay";
  endpoint?: string;
  port?: number;
  protocol?: string;
  relatedAddress?: string;
  raw?: string;
  geo?: Geo;
}
