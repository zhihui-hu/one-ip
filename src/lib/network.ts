import { t } from "@/i18n";
import { localizeApiMessage } from "@/i18n/api-message";
import { normalizeIp } from "@/lib/ip-address";

export type ResponseMode =
  | "json"
  | "text"
  | "opaque"
  | "headers"
  | "response"
  // Unchecked Response, including opaque and non-2xx, for probes that classify status themselves.
  | "raw";
export class HttpRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

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
  signal.throwIfAborted();
  let onAbort: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(url, {
          ...init,
          signal,
          referrerPolicy: "no-referrer",
        });
        if (mode === "opaque") return undefined as T;
        if (mode === "raw") return response as T;
        if (!response.ok) {
          let message = t("api.requestFailed", [response.status]);
          try {
            const body = await response.json();
            if (typeof body.error === "string")
              message = localizeApiMessage(body.error);
          } catch {
            /* Non-JSON upstream. */
          }
          throw new HttpRequestError(response.status, message);
        }
        if (mode === "headers") return response.headers as T;
        if (mode === "response") return response as T;
        return (
          mode === "text" ? response.text() : response.json()
        ) as Promise<T>;
      })(),
      aborted,
    ]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

export function endpoint<T>(path: string, init?: RequestInit) {
  return request<T>(
    `${import.meta.env?.VITE_API_BASE_URL ?? "/api"}${path}`,
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
  const ip = normalizeIp(fields.ip);
  if (!ip) throw new Error(t("common.targetSiteDidReturnReadableEgressIp"));
  return {
    ip,
    country_code: fields.loc,
    colo: fields.colo,
    source: "Cloudflare Trace",
  };
}

export async function trace(domain: string, signal?: AbortSignal) {
  return parseTrace(
    await request<string>(
      `https://${domain}/cdn-cgi/trace`,
      {
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(3000)])
          : AbortSignal.timeout(3000),
        cache: "no-store",
      },
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
          ? AbortSignal.any([signal, AbortSignal.timeout(3000)])
          : AbortSignal.timeout(3000),
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
export function maskedIp(ip: string, hidden: boolean) {
  if (!hidden) return ip;
  return ip.includes(":")
    ? `${ip.split(":").slice(0, 2).join(":")}:****:****`
    : ip
        .split(".")
        .map((x, i) => (i > 1 ? "*" : x))
        .join(".");
}
