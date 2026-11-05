import { normalizeIp } from "@/lib/ip-address";
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

const claudeDomains = ["claude.ai", "claude.com"] as const;

function claudeExit(
  domain: (typeof claudeDomains)[number],
  signal: AbortSignal,
) {
  return trace(domain, AbortSignal.any([signal, AbortSignal.timeout(3000)]));
}

export function compareExits(left?: string, right?: string) {
  const leftIp = normalizeIp(left);
  const rightIp = normalizeIp(right);
  if (!leftIp || !rightIp) return "unknown";
  return leftIp === rightIp ? "same" : "different";
}
