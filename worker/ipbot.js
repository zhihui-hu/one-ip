import { HttpError, publicIp, upstream } from "./http.js";

/**
 * ipbot (https://ipbot.net) is the only data source: IP data, Global Ping (ipbot runs
 * the Globalping measurements) and service status.
 */
export const IPBOT_API_URL = "https://api.ipbot.net";

function sameIp(value, ip) {
  try {
    return publicIp(value) === ip;
  } catch {
    return false;
  }
}

function base(env) {
  return (env?.IPBOT_API_URL?.trim() || IPBOT_API_URL).replace(/\/+$/, "");
}

/** This site's origin as ipbot sees it; huzhihui.com is on ipbot's partner whitelist. */
export const IPBOT_ORIGIN = "https://ip.huzhihui.com";

/**
 * ipbot whitelists partner domains by `Origin` (`PARTNER_DOMAINS` on ipbot): those calls
 * need no page session and are not rate limited. `IPBOT_ORIGIN` overrides it for a fork
 * on another whitelisted domain.
 */
function headers(env, extra = {}) {
  return {
    Accept: "application/json",
    Origin: env?.IPBOT_ORIGIN?.trim() || IPBOT_ORIGIN,
    ...extra,
  };
}

/**
 * GET one of ipbot's keyless public IP routes (`/geoip/…`, `/ip/lookup/…`, `/ip/profile/…`).
 * `IPBOT_API_URL` points at a self-hosted ipbot; it defaults to the public instance.
 */
export async function ipbot(env, path, maxBytes) {
  return upstream(
    `${base(env)}/api${path}`,
    { headers: headers(env), redirect: "manual" },
    maxBytes,
  );
}

/**
 * Calls a whitelist-only route (ping, status, WHOIS, network). ipbot's own 4xx messages
 * (invalid target, unknown service) reach the visitor; anything else is a 502.
 */
async function partner(env, path, init = {}, maxBytes = 2_000_000) {
  let response;
  try {
    response = await fetch(`${base(env)}/api${path}`, {
      ...init,
      headers: headers(env, init.headers),
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new HttpError(502, "外部数据源连接失败或超时");
  }
  if (!response.ok) {
    const error = await response.json().catch(() => undefined);
    const status = response.status;
    if (status === 429) throw new HttpError(429, "外部数据源限流，请稍后重试");
    // 401/403 mean this origin is not whitelisted: an operator problem, not the visitor's.
    if (
      status >= 400 &&
      status < 500 &&
      status !== 401 &&
      status !== 403 &&
      error?.error
    )
      throw new HttpError(status, String(error.error).slice(0, 200));
    throw new HttpError(502, `外部数据源暂不可用 (${status})`);
  }
  const length = Number(response.headers.get("Content-Length"));
  if (length > maxBytes) {
    await response.body?.cancel();
    throw new HttpError(502, "外部数据源响应过大");
  }
  const text = await response.text();
  if (text.length > maxBytes) throw new HttpError(502, "外部数据源响应过大");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(502, "外部数据源返回了无效数据");
  }
}

/** Global Ping probe locations (ipbot keeps Globalping's catalog). */
export const pingNodes = (env) => partner(env, "/ping/nodes", {}, 8_000_000);

/** Starts a measurement; `input` is checked again by ipbot. */
export const startPing = (input, env) =>
  partner(env, "/ping/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      host: input.host,
      protocol: input.protocol,
      preferred: input.preferred,
      nodes: input.nodes,
      regions: input.regions,
      perRegion: input.perRegion,
    }),
  });

export function pingResult(id, env) {
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(id))
    throw new HttpError(400, "无效的测量 ID");
  return partner(env, `/ping/result/${id}`);
}

/** ipbot labels third-party monitors by provider; the site only names ipbot. */
const monitorLabel = /\s*\(UptimeRobot\)\s*$/i;

/** Current state, components and incidents of one catalog service. */
export async function serviceStatus(id, env) {
  const data = await partner(env, `/status/${encodeURIComponent(id)}`);
  if (!data?.status?.status?.indicator)
    throw new HttpError(502, data?.error || "官方状态数据暂不可用");
  const status = { ...data.status };
  if (/uptimerobot\.com/i.test(String(status.source ?? "")))
    delete status.source;
  if (Array.isArray(status.components))
    status.components = status.components.map((component) =>
      typeof component?.name === "string"
        ? { ...component, name: component.name.replace(monitorLabel, "") }
        : component,
    );
  return status;
}

/** Location for one public IP. */
export async function geoIp(value, env) {
  const ip = publicIp(value);
  const data = await ipbot(env, `/geoip/${encodeURIComponent(ip)}`, 64_000);
  if (!sameIp(data?.ip, ip) || (!data.country && !data.isp))
    throw new Error("IP 归属地数据源未返回有效结果");
  return {
    ip,
    country: data.country ?? undefined,
    country_code: data.country_code ?? undefined,
    region: data.region ?? undefined,
    city: data.city ?? undefined,
    isp: data.isp ?? undefined,
    asn: data.asn ?? undefined,
    latitude: data.latitude ?? undefined,
    longitude: data.longitude ?? undefined,
    timezone: data.timezone ?? undefined,
    source: "ipbot",
  };
}

const coordinate = (value, limit) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  Math.abs(value) <= limit
    ? value
    : undefined;

/** Location, per-dataset sources and RDAP for one public IP. */
export async function lookupIp(value, env) {
  const ip = publicIp(value);
  const data = await ipbot(env, `/ip/lookup/${encodeURIComponent(ip)}`);
  const geo = data?.geo;
  if (!sameIp(geo?.ip, ip)) throw new Error("IP 数据源返回的地址不匹配");
  return {
    geo: { ...geo, ip, source: "ipbot" },
    sources: (Array.isArray(data.sources) ? data.sources : []).map(
      (source) => ({
        ip,
        source: `ipbot / ${source?.src ?? "—"}`,
        country: source?.country ?? undefined,
        country_code: source?.country_code ?? undefined,
        region: source?.region ?? undefined,
        city: source?.city ?? undefined,
        latitude: coordinate(source?.lat, 90),
        longitude: coordinate(source?.lon, 180),
      }),
    ),
    rdap: data.rdap ?? undefined,
  };
}

/** Full flat profile: location, network, intel flags, scores, history, rDNS and routing. */
export async function ipProfile(value, env) {
  const ip = publicIp(value);
  const data = await ipbot(env, `/ip/profile/${encodeURIComponent(ip)}`);
  if (!sameIp(data?.ip, ip)) throw new Error("IP 数据源返回的地址不匹配");
  return data;
}

/** Prefix, origin ASNs, RPKI, rDNS and upstream topology of one public IP. */
export const ipNetwork = (ip, env) =>
  partner(env, `/ip/network/${encodeURIComponent(ip)}`);

/** RDAP registration for a domain, IP or AS number already checked by `registrationTarget`. */
export const lookupRegistration = (query, env) =>
  partner(env, `/whois/lookup/${encodeURIComponent(query)}`);
