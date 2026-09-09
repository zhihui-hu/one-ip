import { publicIp, upstream } from "./http.js";

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
  publicIp(ip);
  const data = await upstream(`https://ipwho.is/${encodeURIComponent(ip)}`);
  if (!data.success) throw new Error("IP 归属地数据源未返回有效结果");
  return {
    ip: data.ip,
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
  publicIp(ip);
  const data = await upstream(
    `https://api.ip.sb/geoip/${encodeURIComponent(ip)}`,
  );
  if (!data.ip) throw new Error("第二归属地数据源未返回结果");
  return {
    ip: data.ip,
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
export async function riskIp(ip, env) {
  publicIp(ip);
  if (!env.IPQS_KEY)
    return {
      available: false,
      reason: "尚未配置 IPQS 风险数据源；无法推断住宅、VPN、滥用或信任评分。",
    };
  const data = await upstream(
    `https://www.ipqualityscore.com/api/json/ip/${encodeURIComponent(env.IPQS_KEY)}/${encodeURIComponent(ip)}?strictness=1&allow_public_access_points=true`,
  );
  if (!data.success)
    return {
      available: false,
      reason: "风险数据源未返回有效结果，请检查服务额度与配置。",
    };
  return {
    available: true,
    source: "IPQualityScore（非 AI 平台官方评分）",
    fraud_score: data.fraud_score,
    vpn: data.vpn,
    proxy: data.proxy,
    tor: data.tor,
    bot_status: data.bot_status,
    recent_abuse: data.recent_abuse,
    connection_type: data.connection_type,
  };
}
