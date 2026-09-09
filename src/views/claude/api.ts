import { endpoint, trace } from "@/lib/network";
import type { Geo, Risk } from "@/lib/types";
import { getDomesticIp } from "@/views/home/api";

export const claudeApi = {
  domestic: getDomesticIp,
  cloudflare: (signal: AbortSignal) => trace("1.1.1.1", signal),
  exit: (signal: AbortSignal) => trace("claude.ai", signal),
  geo: (ip: string, signal: AbortSignal) =>
    endpoint<Geo>(`/geoip/${encodeURIComponent(ip)}`, { signal }),
  risk: (ip: string, signal: AbortSignal) =>
    endpoint<Risk>(`/iprisk/${encodeURIComponent(ip)}`, { signal }),
};
