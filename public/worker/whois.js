import { isIP } from "node:net";
import { HttpError, publicIp, target, upstream } from "./http.js";

export async function lookupRegistration(query) {
  const raw = query.trim();
  let path;
  let endpoint;
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
    const domain = target(ascii);
    path = `domain/${encodeURIComponent(domain)}`;
    const bootstrap = await upstream("https://data.iana.org/rdap/dns.json", {
      cf: { cacheTtl: 86400, cacheEverything: true },
    });
    const urls = bootstrap.services.find(([suffixes]) =>
      suffixes.includes(domain.split(".").at(-1)),
    )?.[1];
    const base = urls?.find((url) => url.startsWith("https://"));
    if (!base) throw new HttpError(422, "该域名后缀暂无可用的 HTTPS RDAP 服务");
    endpoint = new URL(path, base.endsWith("/") ? base : `${base}/`).href;
  }
  const options = {
    headers: { Accept: "application/rdap+json, application/json" },
  };
  let data;
  try {
    data = await upstream(endpoint ?? `https://rdap.org/${path}`, options);
  } catch (error) {
    if (!isIP(raw)) throw error;
    const ip = publicIp(raw);
    const bootstrap = await upstream(
      `https://data.iana.org/rdap/ipv${isIP(ip)}.json`,
      {
        cf: { cacheTtl: 86400, cacheEverything: true },
      },
    );
    const base = registrationServer(ip, bootstrap.services);
    if (!base) throw error;
    data = await upstream(new URL(path, base).href, options);
  }
  return { source: "RDAP · 注册局实时数据", query: raw, data };
}

function ipNumber(ip) {
  if (isIP(ip) === 4)
    return ip.split(".").reduce((n, part) => (n << 8n) + BigInt(part), 0n);
  const [left, right] = ip.split("::");
  const head = left ? left.split(":") : [];
  const tail = right ? right.split(":") : [];
  const parts =
    right === undefined
      ? head
      : [...head, ...Array(8 - head.length - tail.length).fill("0"), ...tail];
  return parts.reduce((n, part) => (n << 16n) + BigInt(`0x${part}`), 0n);
}
export function registrationServer(ip, services) {
  const bits = isIP(ip) === 4 ? 32 : 128;
  const value = ipNumber(ip);
  const matches = services
    .flatMap(([prefixes, urls]) =>
      prefixes.flatMap((prefix) => {
        const [address, length] = prefix.split("/");
        if (isIP(address) !== isIP(ip)) return [];
        const shift = BigInt(bits - Number(length));
        return value >> shift === ipNumber(address) >> shift
          ? [{ length: Number(length), urls }]
          : [];
      }),
    )
    .sort((a, b) => b.length - a.length);
  return matches[0]?.urls.find((url) => url.startsWith("https://"));
}
