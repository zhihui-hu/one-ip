import { HttpError, json, publicIp, upstream } from "./http.js";

export async function ipHealth(request, env) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "json";
  if (!["json", "text"].includes(format))
    throw new HttpError(400, "format 仅支持 json 或 text");
  const target = url.searchParams.get("ip");
  if (
    target === null &&
    (env.LOCAL_DEV === "true" || !request.headers.get("CF-Connecting-IP"))
  )
    throw new HttpError(
      503,
      "无法获取真实访客 IP，请指定 ip 参数或部署 Worker 后检测",
    );
  const ip = publicIp(target ?? request.headers.get("CF-Connecting-IP"));
  const data = await upstream(
    `https://ip.net.coffee/api/ip/lookup/${encodeURIComponent(ip)}`,
    { redirect: "manual" },
  );
  let returnedIp;
  try {
    returnedIp = publicIp(data?.ip);
  } catch {
    throw new HttpError(502, "IP 数据源返回的地址无效");
  }
  if (returnedIp !== ip) throw new HttpError(502, "IP 数据源返回的地址不匹配");
  const score =
    typeof data.trust_score === "number" &&
    Number.isFinite(data.trust_score) &&
    data.trust_score >= 0 &&
    data.trust_score <= 100
      ? data.trust_score
      : null;
  const flag = (value) => (typeof value === "boolean" ? value : null);
  const string = (value) => (typeof value === "string" ? value : null);
  const result = {
    ip,
    source: "Net.Coffee",
    checked_at: new Date().toISOString(),
    score,
    status:
      score === null
        ? "unknown"
        : score >= 75
          ? "good"
          : score >= 45
            ? "moderate"
            : "poor",
    country: string(data.country),
    region: string(data.region),
    city: string(data.city),
    isp: string(data.isp),
    asn: Number.isInteger(data.asn) ? data.asn : null,
    flags: {
      residential: flag(data.isResidential),
      datacenter: flag(data.is_datacenter),
      mobile: flag(data.is_mobile),
      vpn: flag(data.is_vpn),
      proxy: flag(data.is_proxy),
      tor: flag(data.is_tor),
      crawler: flag(data.is_crawler),
      abuser: flag(data.is_abuser),
    },
  };
  if (format === "json") return json(result);
  // Strip control characters from provider text before displaying it in a terminal.
  const display = (value) =>
    // eslint-disable-next-line no-control-regex -- Prevent terminal escape sequences in upstream values.
    String(value ?? "unknown").replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");
  const lines = [
    "One IP — IP health",
    ...Object.entries(result).filter(([key]) => key !== "flags"),
    ...Object.entries(result.flags),
  ].map((row) => (Array.isArray(row) ? `${row[0]}: ${display(row[1])}` : row));
  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
