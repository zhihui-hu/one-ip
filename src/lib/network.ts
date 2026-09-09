export type ResponseMode = "json" | "text" | "opaque" | "headers";

/** Only HTTP transport for browser probes and API calls. Never proxy browser probes. */
export async function request<T>(
  url: string,
  init: RequestInit = {},
  mode: ResponseMode = "json",
): Promise<T> {
  const timeout = AbortSignal.timeout(12_000);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeout])
    : timeout;
  const response = await fetch(url, { ...init, signal });
  if (mode === "opaque") return undefined as T;
  if (!response.ok) {
    let message = `请求失败 (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body.error === "string") message = body.error;
    } catch {
      /* Non-JSON upstream. */
    }
    throw new Error(message);
  }
  if (mode === "headers") return response.headers as T;
  return (mode === "text" ? response.text() : response.json()) as Promise<T>;
}

export function endpoint<T>(path: string, init?: RequestInit) {
  return request<T>(
    `${import.meta.env.VITE_API_BASE_URL ?? "/api"}${path}`,
    init,
  );
}

export function parseTrace(text: string) {
  const fields = Object.fromEntries(
    text
      .trim()
      .split("\n")
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1)];
      }),
  );
  if (!fields.ip || !/^[\da-fA-F:.]+$/.test(fields.ip))
    throw new Error("目标站点未返回可读取的出口 IP");
  return {
    ip: fields.ip,
    country_code: fields.loc,
    colo: fields.colo,
    source: "Cloudflare Trace",
  };
}

export async function trace(domain: string, signal?: AbortSignal) {
  return parseTrace(
    await request<string>(
      `https://${domain}/cdn-cgi/trace`,
      { signal, cache: "no-store" },
      "text",
    ),
  );
}

export async function probe(url: string, signal?: AbortSignal) {
  const start = performance.now();
  try {
    await request<void>(
      url,
      {
        mode: "no-cors",
        cache: "no-store",
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(2500)])
          : AbortSignal.timeout(2500),
      },
      "opaque",
    );
    return Math.round(performance.now() - start);
  } catch (error) {
    if (signal?.aborted) throw error;
    return -1;
  }
}

/** Bound browser concurrency without retaining request state between runs. */
export async function pool<T, R>(
  items: T[],
  run: (item: T, index: number) => Promise<R>,
  limit = 6,
): Promise<R[]> {
  let cursor = 0;
  const results: R[] = new Array(items.length);
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await run(items[index], index);
      }
    }),
  );
  return results;
}

export function maskedIp(ip: string, hidden: boolean) {
  if (!hidden) return ip;
  return ip.includes(":")
    ? `${ip.split(":").slice(0, 2).join(":")}:****:****`
    : ip
        .split(".")
        .map((x, i) => (i > 1 ? "*" : x))
        .join(".");
}

export function flag(code?: string) {
  return code && /^[a-z]{2}$/i.test(code)
    ? String.fromCodePoint(
        ...code
          .toUpperCase()
          .split("")
          .map((c) => 127397 + c.charCodeAt(0)),
      )
    : "🌐";
}
