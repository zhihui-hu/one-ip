import { endpoint, trace } from "@/lib/network";
import type { Geo } from "@/lib/types";
import { getDomesticIp } from "@/views/home/api";

export const claudeApi = {
  domestic: getDomesticIp,
  cloudflare: (signal: AbortSignal) => trace("1.1.1.1", signal),
  exit: (signal: AbortSignal) => claudeExit("claude.ai", signal),
  geo: (ip: string, signal: AbortSignal) =>
    endpoint<Geo>(`/geoip/${encodeURIComponent(ip)}`, { signal }),
};

/** Exit region as seen by claude.ai; falls back to this Worker when claude.ai is unreachable. */
export async function claudeExitRegion(signal: AbortSignal) {
  try {
    const exit = await claudeExit("claude.ai", signal);
    return { country: exit.country_code, source: "claude.ai" };
  } catch (error) {
    if (signal.aborted) throw error;
    const geo = await endpoint<Geo>("/me", { signal });
    return { country: geo.country_code, source: "Cloudflare" };
  }
}

export const claudeDomains = ["claude.ai", "claude.com"] as const;

export function claudeExit(
  domain: (typeof claudeDomains)[number],
  signal: AbortSignal,
) {
  return trace(domain, AbortSignal.any([signal, AbortSignal.timeout(3000)]));
}

export function compareExits(left?: string, right?: string) {
  if (!left || !right) return "unknown";
  const normalize = (ip: string) =>
    ip.includes(":") ? new URL(`https://[${ip}]/`).hostname : ip;
  return normalize(left) === normalize(right) ? "same" : "different";
}
