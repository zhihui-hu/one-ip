import { isIP } from "node:net";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function publicIp(value) {
  if (!isIP(value))
    throw new HttpError(400, "请输入有效的公网 IPv4 或 IPv6 地址");
  const ip = value.toLowerCase();
  if (isIP(ip) === 6) {
    if (ip.startsWith("::ffff:")) {
      const mapped = ip.slice(7);
      if (isIP(mapped) === 4) publicIp(mapped);
      else throw new HttpError(400, "不支持映射 IPv6 地址，请输入 IPv4");
    }
    if (ip === "::" || ip === "::1" || /^(fc|fd|fe[89ab]|ff)/.test(ip))
      throw new HttpError(400, "不支持私有、回环或保留地址");
  } else {
    const [a, b, c] = ip.split(".").map(Number);
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    )
      throw new HttpError(400, "不支持私有、回环或保留地址");
  }
  return ip;
}
export function target(value) {
  if (typeof value !== "string" || !value || value.length > 253)
    throw new HttpError(400, "请输入有效的域名或 IP");
  const normalized = value.trim().replace(/\.$/, "").toLowerCase();
  if (isIP(normalized)) return publicIp(normalized);
  if (
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(
      normalized,
    ) ||
    /\.(localhost|local|internal|test|invalid|example)$/.test(normalized)
  )
    throw new HttpError(400, "请输入公网域名，不包含协议、路径或端口");
  return normalized;
}
export async function boundedJson(response, maxBytes = 2_000_000) {
  const reader = response.body?.getReader();
  if (!reader) throw new HttpError(502, "数据源返回空响应");
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new HttpError(502, "数据源响应过大");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(502, "数据源没有返回有效 JSON");
  }
}
export async function upstream(url, init = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new HttpError(502, "外部数据源连接失败或超时");
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new HttpError(
      response.status === 429 ? 429 : 502,
      response.status === 429
        ? "外部数据源限流，请稍后重试"
        : `外部数据源暂不可用 (${response.status})`,
    );
  }
  return boundedJson(response);
}
export async function inputJson(request) {
  if (!request.headers.get("Content-Type")?.includes("application/json"))
    throw new HttpError(415, "需要 application/json");
  return boundedJson(request, 4096);
}
