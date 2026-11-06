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
export type DnsResolver = {
  ip: string;
  geo: string;
  country?: string;
  isp?: string;
};

const isoCountry = (value: unknown) =>
  typeof value === "string" && /^[a-z]{2}$/i.test(value)
    ? { country: value.toUpperCase() }
    : {};
const placeholder = /^(?:none|unknown|n\/a|-)$/i;
const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "" && !placeholder.test(value);
// Fastly reports "GOOGLE - Google LLC, US"; keep the readable organisation.
const ispName = (value: unknown) => {
  if (!text(value)) return {};
  const isp = value
    .replace(/^[A-Z0-9-]+ - /, "")
    .replace(/, [A-Z]{2}$/, "")
    .trim();
  return text(isp) ? { isp } : {};
};

export function parseDnsResponse(source: string, data: unknown): DnsResolver[] {
  if (!data || typeof data !== "object") return [];
  const record = data as Record<string, unknown>;
  if (source === "Fastly") {
    const info = record.dns_resolver_info as
      Record<string, unknown> | undefined;
    return info &&
      typeof info.ip === "string" &&
      /^[\da-fA-F:.]+$/.test(info.ip) &&
      /[.:]/.test(info.ip)
      ? [
          {
            ip: info.ip,
            geo: [info.cc, info.as_name].filter(text).join(" · "),
            ...isoCountry(info.cc),
            ...ispName(info.as_name),
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
          geo: value.slice(1).filter(text).join(" · "),
          ...isoCountry(value[0]),
          ...ispName(value[2]),
        },
      ];
    }
    if (source === "Surfshark" && value && typeof value === "object") {
      const info = value as Record<string, unknown>;
      return [
        {
          ip,
          geo: [info.Country, info.City, info.ISP].filter(text).join(" · "),
          ...isoCountry(info.CountryCode),
          ...ispName(info.ISP),
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
  if (!results.length) throw new Error(t("dns.noDnsEgressObtained"));
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
                found.country ??= resolver.country;
                found.isp ??= resolver.isp;
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
    throw new Error(t("dns.dnsEgressCheckFailedPossiblyDueNetworkProxy"));
  return state;
}

const publicDnsProviders: [RegExp, string][] = [
  [/google/i, "Google"],
  [/cloudflare/i, "Cloudflare"],
  [/quad9/i, "Quad9"],
  [/opendns|cisco/i, "OpenDNS"],
  [/nextdns/i, "NextDNS"],
  [/adguard/i, "AdGuard"],
  [/control ?d\b/i, "Control D"],
  [/cleanbrowsing/i, "CleanBrowsing"],
  [/mullvad/i, "Mullvad"],
  [/yandex/i, "Yandex"],
  [/alibaba|aliyun/i, "AliDNS"],
  [/tencent|dnspod/i, "DNSPod"],
  [/baidu/i, "Baidu"],
];
/** Name of a well-known public resolver operator, inferred from the ISP. */
export function publicDnsProvider(isp: string | undefined) {
  return isp
    ? publicDnsProviders.find(([pattern]) => pattern.test(isp))?.[1]
    : undefined;
}

export type DnsRelation = "match" | "mismatch" | "unknown";
export type LeakLevel = "safe" | "leak" | "warning" | "unknown";
export interface DnsAssessment {
  level: LeakLevel;
  egressCountries: string[];
  relations: Record<string, DnsRelation>;
  mismatched: DnsResolver[];
  unknown: number;
}

/** Compare resolver countries with the HTTP egress countries (IPv4/IPv6). */
export function assessDnsLeak(
  results: DnsResolver[],
  egressCountryCodes: (string | undefined)[],
): DnsAssessment {
  const egressCountries = [
    ...new Set(
      egressCountryCodes.flatMap((code) =>
        code && /^[a-z]{2}$/i.test(code) ? [code.toUpperCase()] : [],
      ),
    ),
  ];
  const relations: Record<string, DnsRelation> = {};
  for (const resolver of results)
    relations[resolver.ip] =
      !egressCountries.length || !resolver.country
        ? "unknown"
        : egressCountries.includes(resolver.country)
          ? "match"
          : "mismatch";
  const mismatched = results.filter(
    (resolver) => relations[resolver.ip] === "mismatch",
  );
  const unknown = results.filter(
    (resolver) => relations[resolver.ip] === "unknown",
  ).length;
  const level: LeakLevel =
    !results.length || !egressCountries.length || unknown === results.length
      ? "unknown"
      : mismatched.length
        ? "leak"
        : unknown
          ? "warning"
          : "safe";
  return { level, egressCountries, relations, mismatched, unknown };
}
