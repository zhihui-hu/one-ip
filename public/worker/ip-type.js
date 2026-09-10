import { boundedJson, json, publicIp } from "./http.js";

let retryAfter = 0;

export async function ipType(value, origin) {
  const ip = publicIp(value);
  const cache = globalThis.caches?.default;
  const key = new Request(
    `${origin}/api/ip-type/${encodeURIComponent(ip)}?v=2`,
  );
  const cached = await cache?.match(key).catch(() => undefined);
  if (cached) return cached;
  if (Date.now() < retryAfter) return json({ available: false });
  try {
    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,query,hosting,mobile,proxy`,
      { redirect: "manual", signal: AbortSignal.timeout(5000) },
    );
    if (response.status === 429 || response.headers.get("X-Rl") === "0") {
      const ttl = Number(response.headers.get("X-Ttl"));
      retryAfter =
        Date.now() + (Number.isFinite(ttl) && ttl > 0 ? ttl : 60) * 1000;
    }
    if (!response.ok) {
      await response.body?.cancel();
      return json({ available: false });
    }
    const data = await boundedJson(response, 4096);
    if (
      data.status !== "success" ||
      ![data.hosting, data.mobile, data.proxy].every(
        (flag) => typeof flag === "boolean",
      ) ||
      publicIp(data.query) !== ip
    )
      return json({ available: false });
    const result = Response.json(
      {
        available: true,
        hosting: data.hosting,
        mobile: data.mobile,
        proxy: data.proxy,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
    await cache?.put(key, result.clone()).catch(() => {});
    return result;
  } catch {
    return json({ available: false });
  }
}
