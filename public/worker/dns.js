import { HttpError, upstream } from "./http.js";

function config(env) {
  if (!env.DNS_BACKEND_URL || !env.DNS_PROBE_SUFFIX)
    throw new HttpError(
      503,
      "DNS 泄露检测尚未配置权威 DNS 后端。Worker 无法独立监听 UDP/53；请配置 DNS_BACKEND_URL 与 DNS_PROBE_SUFFIX。",
    );
  const url = new URL(env.DNS_BACKEND_URL);
  if (url.protocol !== "https:" || url.username || url.password)
    throw new HttpError(503, "DNS 后端需要有效的 HTTPS 地址");
  return {
    url: url.origin + url.pathname.replace(/\/$/, ""),
    headers: {
      "Content-Type": "application/json",
      ...(env.DNS_BACKEND_TOKEN
        ? { Authorization: `Bearer ${env.DNS_BACKEND_TOKEN}` }
        : {}),
    },
  };
}
export async function startDns(input, env) {
  const { url, headers } = config(env);
  const data = await upstream(`${url}/sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ probes: input.deep ? 12 : 4, ttl: 60 }),
  });
  if (
    !/^[a-zA-Z0-9_-]{16,100}$/.test(data.token) ||
    !Array.isArray(data.probeUrls) ||
    data.probeUrls.length < 1 ||
    data.probeUrls.length > 12
  )
    throw new HttpError(502, "DNS 后端返回无效会话");
  for (const probe of data.probeUrls) {
    const p = new URL(probe);
    if (
      p.protocol !== "https:" ||
      !p.hostname.endsWith(`.${env.DNS_PROBE_SUFFIX}`) ||
      p.port ||
      p.username ||
      p.password
    )
      throw new HttpError(502, "DNS 探测域名不在配置的后缀范围内");
  }
  return { token: data.token, probeUrls: data.probeUrls };
}
export async function dnsResult(token, env) {
  const { url, headers } = config(env);
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(token))
    throw new HttpError(400, "无效的检测会话");
  const data = await upstream(`${url}/sessions/${token}`, { headers });
  if (
    !Array.isArray(data.resolvers) ||
    typeof data.complete !== "boolean" ||
    data.resolvers.length > 100
  )
    throw new HttpError(502, "DNS 后端返回无效检测结果");
  return { resolvers: data.resolvers, complete: data.complete };
}
