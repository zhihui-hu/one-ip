import { isIP } from "node:net";
import { HttpError, publicIp, target, upstream } from "./http.js";

export async function lookupRegistration(query) {
  const raw = query.trim();
  let path;
  if (/^AS\d+$/i.test(raw)) {
    const asn = Number(raw.slice(2));
    if (!Number.isSafeInteger(asn) || asn < 1 || asn > 4294967295)
      throw new HttpError(400, "无效的 AS 号");
    path = `autnum/${asn}`;
  } else if (isIP(raw)) path = `ip/${encodeURIComponent(publicIp(raw))}`;
  else {
    let ascii;
    try {
      ascii = new URL(`https://${raw}`).hostname;
    } catch {
      throw new HttpError(400, "请输入有效的域名、IP 或 AS 号");
    }
    // Reject paths/userinfo instead of silently querying a different resource.
    if (/[\s/@?#:]/.test(raw))
      throw new HttpError(400, "仅输入域名，不包含路径或协议");
    path = `domain/${encodeURIComponent(target(ascii))}`;
  }
  const data = await upstream(`https://rdap.org/${path}`, {
    headers: { Accept: "application/rdap+json, application/json" },
  });
  return { source: "RDAP · 注册局实时数据", query: raw, data };
}
