import { endpoint } from "@/lib/network";

export interface Registration {
  source: string;
  query: string;
  data: {
    ldhName?: string;
    name?: string;
    handle?: string;
    objectClassName?: string;
    country?: string;
    startAddress?: string;
    endAddress?: string;
    status?: string[];
    events?: { eventAction: string; eventDate: string }[];
    nameservers?: { ldhName?: string }[];
    entities?: {
      handle?: string;
      roles?: string[];
      vcardArray?: [string, unknown[][]];
    }[];
    notices?: { title?: string; description?: string[] }[];
  };
}
export const lookupWhois = (query: string, signal: AbortSignal) =>
  endpoint<Registration>(`/whois/lookup/${encodeURIComponent(query)}`, {
    signal,
  });
