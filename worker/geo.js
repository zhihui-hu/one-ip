import { clientIp } from "./http.js";

export function cfGeo(request) {
  const cf = request.cf ?? {};
  return {
    ip: clientIp(request) ?? "",
    country: cf.country,
    country_code: cf.country,
    region: cf.region,
    city: cf.city,
    isp: cf.asOrganization,
    asn: cf.asn,
    latitude: cf.latitude ? Number(cf.latitude) : undefined,
    longitude: cf.longitude ? Number(cf.longitude) : undefined,
    timezone: cf.timezone,
    source: request.clientIpSource ?? "Cloudflare request.cf",
  };
}
