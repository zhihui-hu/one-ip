import { publicIp, upstream } from "./http.js";

function normalizeReturnedIp(target, value) {
  const normalized = typeof value === "string" ? value.trim() : value;
  try {
    const returned = publicIp(normalized);
    if (returned === target) return returned;
  } catch {
    /* Treat malformed upstream data as a failed source response. */
  }
  throw new Error("归属地数据源返回了不匹配的 IP");
}

export function cfGeo(request) {
  const cf = request.cf ?? {};
  return {
    ip: request.headers.get("CF-Connecting-IP") ?? "",
    country: cf.country,
    country_code: cf.country,
    region: cf.region,
    city: cf.city,
    isp: cf.asOrganization,
    asn: cf.asn,
    latitude: cf.latitude ? Number(cf.latitude) : undefined,
    longitude: cf.longitude ? Number(cf.longitude) : undefined,
    timezone: cf.timezone,
    source: "Cloudflare request.cf",
  };
}
export async function geoIp(ip) {
  const target = publicIp(ip);
  const data = await upstream(`https://ipwho.is/${encodeURIComponent(target)}`);
  if (!data.success) throw new Error("IP 归属地数据源未返回有效结果");
  const returnedIp = normalizeReturnedIp(target, data.ip);
  return {
    ip: returnedIp,
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
export async function secondaryGeo(ip) {
  const target = publicIp(ip);
  const data = await upstream(
    `https://api.ip.sb/geoip/${encodeURIComponent(target)}`,
  );
  if (!data.ip) throw new Error("第二归属地数据源未返回结果");
  const returnedIp = normalizeReturnedIp(target, data.ip);
  return {
    ip: returnedIp,
    country: data.country,
    country_code: data.country_code,
    city: data.city,
    isp: data.isp,
    asn: data.asn,
    latitude: data.latitude,
    longitude: data.longitude,
    source: "ip.sb",
  };
}
