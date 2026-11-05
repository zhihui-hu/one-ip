import { sameIp } from "@/lib/ip-address";
import { trace } from "@/lib/network";
import type { Geo } from "@/lib/types";
import { getBrowserIp, getGeo } from "@/views/home/api";

/** Browser HTTP egress per address family, used as the leak-test baseline. */
export interface HttpEgress {
  ipv4: Geo | null;
  ipv6: Geo | null;
}

export const egressAddresses = (egress: HttpEgress | null | undefined) =>
  [egress?.ipv4, egress?.ipv6].filter((geo): geo is Geo => Boolean(geo));

// Cloudflare trace endpoints reachable only over one address family.
const traceHosts = { 4: "1.1.1.1", 6: "[2606:4700:4700::1111]" } as const;

/** Country code from Cloudflare trace, used when geo providers fail. */
async function traceCountry(ip: string, signal: AbortSignal) {
  try {
    const result = await trace(traceHosts[ip.includes(":") ? 6 : 4], signal);
    return sameIp(result.ip, ip) && result.country_code !== "XX"
      ? result.country_code
      : undefined;
  } catch {
    signal.throwIfAborted();
    return undefined;
  }
}

async function locate(geo: Geo | null, signal: AbortSignal) {
  if (!geo) return null;
  let located: Geo = geo;
  try {
    const found = await getGeo(geo.ip, signal);
    located = {
      ...geo,
      ...found,
      ip: geo.ip,
      country_code: found.country_code ?? geo.country_code,
    };
  } catch {
    signal.throwIfAborted();
  }
  if (located.country_code) return located;
  const country_code = await traceCountry(geo.ip, signal);
  return country_code ? { ...located, country_code } : located;
}

const orNull = (signal: AbortSignal) => () => {
  signal.throwIfAborted();
  return null;
};

export async function detectHttpEgress(
  signal: AbortSignal,
): Promise<HttpEgress> {
  const [ipv4, ipv6] = await Promise.all([
    getBrowserIp(4, signal)
      .catch(() => {
        signal.throwIfAborted();
        return trace("1.1.1.1", signal);
      })
      .catch(orNull(signal)),
    getBrowserIp(6, signal).catch(orNull(signal)),
  ]);
  const [located4, located6] = await Promise.all([
    locate(ipv4, signal),
    locate(ipv6, signal),
  ]);
  signal.throwIfAborted();
  return { ipv4: located4, ipv6: located6 };
}
