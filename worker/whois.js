import { isIP } from "node:net";
import { HttpError, publicIp, target } from "./http.js";

/** Normalizes a WHOIS query (domain, IP or AS number) before it goes to ipbot. */
export function registrationTarget(query) {
  const raw = query.trim();
  if (/^AS\d+$/i.test(raw)) {
    const asn = Number(raw.slice(2));
    if (!Number.isSafeInteger(asn) || asn < 1 || asn > 4294967295)
      throw new HttpError(400, "无效的 AS 号");
    return `AS${asn}`;
  }
  if (isIP(raw)) return publicIp(raw);
  let ascii;
  try {
    ascii = new URL(`https://${raw}`).hostname;
  } catch {
    throw new HttpError(400, "请输入有效的域名、IP 或 AS 号");
  }
  // Reject paths/userinfo instead of silently querying a different resource.
  if (/[\s/@?#:]/.test(raw))
    throw new HttpError(400, "仅输入域名，不包含路径或协议");
  return target(ascii);
}
