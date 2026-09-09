import { endpoint } from "@/lib/network";
import type { Geo, Lookup } from "@/lib/types";

export const lookupIp = (ip: string, signal?: AbortSignal) =>
  endpoint<Lookup>(`/ip/lookup/${encodeURIComponent(ip)}`, { signal });
export const currentIp = (signal?: AbortSignal) =>
  endpoint<Geo>("/me", { signal });
