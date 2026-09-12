import { t } from "@/i18n";
import { normalizePublicIp } from "@/lib/diagnostics";

export type ResponseMode = "json" | "text" | "opaque" | "headers";

type QueueEntry<T> = {
  signal?: AbortSignal;
  task: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
  cancelled: boolean;
  priority: number;
  onAbort?: () => void;
};

/**
 * Limits whole diagnostic operations, including requests made by an adapter.
 * React Query limits cache state but does not limit how many query functions
 * are in flight, so this queue is shared by source and detail probes.
 */
export function createConcurrencyLimiter(limit: number) {
  if (!Number.isInteger(limit) || limit < 1)
    throw new Error("并发上限必须是正整数");
  let active = 0;
  const queue: QueueEntry<unknown>[] = [];
  const drain = () => {
    while (active < limit && queue.length) {
      const entry = queue.shift()!;
      if (entry.cancelled || entry.signal?.aborted) {
        entry.onAbort?.();
        entry.reject(
          entry.signal?.reason ?? new DOMException("已取消", "AbortError"),
        );
        continue;
      }
      active += 1;
      entry.onAbort?.();
      void Promise.resolve()
        .then(entry.task)
        .then(entry.resolve, entry.reject)
        .finally(() => {
          active -= 1;
          drain();
        });
    }
  };
  return {
    run<T>(
      signal: AbortSignal | undefined,
      task: () => Promise<T>,
      priority = 0,
    ) {
      if (signal?.aborted)
        return Promise.reject(
          signal.reason ?? new DOMException("已取消", "AbortError"),
        );
      return new Promise<T>((resolve, reject) => {
        const entry: QueueEntry<T> = {
          signal,
          task,
          resolve,
          reject,
          cancelled: false,
          priority,
        };
        if (signal) {
          const onAbort = () => {
            entry.cancelled = true;
            reject(signal.reason ?? new DOMException("已取消", "AbortError"));
          };
          signal.addEventListener("abort", onAbort, { once: true });
          entry.onAbort = () => signal.removeEventListener("abort", onAbort);
        }
        queue.push(entry as QueueEntry<unknown>);
        queue.sort((left, right) => right.priority - left.priority);
        drain();
      });
    },
    get pending() {
      return queue.length;
    },
    get active() {
      return active;
    },
  };
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
        const response = await fetch(url, { ...init, signal });
        if (mode === "opaque") return undefined as T;
        if (!response.ok) {
          let message = t("请求失败 ({0})", [response.status]);
          try {
            const body = await response.json();
            if (typeof body.error === "string") message = t(body.error);
          } catch {
            /* Non-JSON upstream. */
          }
          const error = new Error(message) as Error & { httpStatus?: number };
          error.httpStatus = response.status;
          throw error;
        }
        if (mode === "headers") return response.headers as T;
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
  const normalized = normalizePublicIp(fields.ip);
  if (!normalized) throw new Error(t("目标站点未返回可读取的出口 IP"));
  return {
    ip: normalized.ip,
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
