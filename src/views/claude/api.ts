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
