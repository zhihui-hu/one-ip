import { t } from "@/i18n";
import { request } from "@/lib/network";

export const dnsSources = [
  { name: "Surfshark", host: "ipv4.surfsharkdns.com", path: "/", samples: 5 },
  {
    name: "Fastly",
    host: "u.fastly-analytics.com",
    path: "/debug_resolver",
    samples: 5,
  },
  {
    name: "BrowserLeaks DNS4",
    host: "dns4.browserleaks.net",
    path: "/",
    samples: 3,
  },
  {
    name: "BrowserLeaks DNS6",
    host: "dns6.browserleaks.net",
    path: "/",
    samples: 3,
  },
] as const;
export type DnsResolver = { ip: string; geo: string };

export function parseDnsResponse(source: string, data: unknown): DnsResolver[] {
  if (!data || typeof data !== "object") return [];
  const record = data as Record<string, unknown>;
  if (source === "Fastly") {
    const info = record.dns_resolver_info as
      Record<string, unknown> | undefined;
    return info && typeof info.ip === "string" && info.ip
      ? [
          {
            ip: info.ip,
            geo: [info.cc, info.as_name]
              .filter((v) => typeof v === "string")
              .join(" · "),
          },
        ]
      : [];
  }
  return Object.entries(record).flatMap(([ip, value]) => {
    if (!/^[\da-fA-F:.]+$/.test(ip) || !/[.:]/.test(ip)) return [];
    if (source.startsWith("BrowserLeaks") && Array.isArray(value)) {
      return [
        {
          ip,
          geo: value
            .slice(1)
            .filter((v) => typeof v === "string")
            .join(" · "),
        },
      ];
    }
    if (source === "Surfshark" && value && typeof value === "object") {
      const info = value as Record<string, unknown>;
      return [
        {
          ip,
          geo: [info.Country, info.City, info.ISP]
            .filter((v) => typeof v === "string")
            .join(" · "),
        },
      ];
    }
    return [];
  });
}

export async function sampleDnsSource(
  source: (typeof dnsSources)[number],
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  const token = crypto.randomUUID().replaceAll("-", "").slice(0, 10);
  const data = await request<unknown>(
    `https://${token}.${source.host}${source.path}`,
    {
      signal,
      cache: "no-store",
      credentials: "omit",
    },
  );
  signal.throwIfAborted();
  const results = parseDnsResponse(source.name, data);
  if (!results.length) throw new Error(t("未获取到 DNS 出口"));
  return results;
}

export async function sampleDnsExit(signal: AbortSignal) {
  return (await sampleDnsSource(dnsSources[0], signal))[0];
}

export type DnsProgress = {
  results: (DnsResolver & { samples: number; sources: string[] })[];
  count: number;
  failed: number;
  failures: Record<string, number>;
};
export const dnsSampleCount = dnsSources.reduce(
  (total, source) => total + source.samples,
  0,
);
export async function detectDnsExits(
  signal: AbortSignal,
  onProgress: (state: DnsProgress) => void,
) {
  let state: DnsProgress = { results: [], count: 0, failed: 0, failures: {} };
  onProgress(state);
  for (
    let round = 0;
    round < Math.max(...dnsSources.map((source) => source.samples));
    round++
  ) {
    signal.throwIfAborted();
    await Promise.all(
      dnsSources
        .filter((source) => round < source.samples)
        .map(async (source) => {
          try {
            const resolvers = await sampleDnsSource(source, signal);
            const results = state.results.map((item) => ({
              ...item,
              sources: [...item.sources],
            }));
            for (const resolver of resolvers) {
              const found = results.find((item) => item.ip === resolver.ip);
              if (found) {
                found.samples++;
                if (!found.sources.includes(source.name))
                  found.sources.push(source.name);
              } else
                results.push({
                  ...resolver,
                  samples: 1,
                  sources: [source.name],
                });
            }
            state = { ...state, results };
          } catch (error) {
            if (signal.aborted) throw error;
            state = {
              ...state,
              failed: state.failed + 1,
              failures: {
                ...state.failures,
                [source.name]: (state.failures[source.name] ?? 0) + 1,
              },
            };
          }
          signal.throwIfAborted();
          state = { ...state, count: state.count + 1 };
          onProgress(state);
        }),
    );
  }
  if (!state.results.length)
    throw new Error(t("DNS 出口检测失败，可能受网络、代理或跨域限制"));
  return state;
}
