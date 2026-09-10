import { t } from "@/i18n";
import { endpoint, request } from "@/lib/network";
import type { Geo } from "@/lib/types";
import { adaptCoffee, type CoffeeIp } from "./coffee.ts";

export async function lookupIp(ip: string, signal?: AbortSignal) {
  const data = await request<CoffeeIp>(
    `https://ip.net.coffee/api/ip/lookup/${encodeURIComponent(ip)}`,
    { signal, mode: "cors", credentials: "omit", cache: "no-store" },
  );
  const normalize = (value: string) =>
    value.includes(":") ? new URL(`https://[${value}]/`).hostname : value;
  if (typeof data.ip !== "string" || normalize(data.ip) !== normalize(ip))
    throw new Error(t("IP 数据源返回的地址不匹配"));
  return adaptCoffee(data);
}
export const currentIp = (signal?: AbortSignal) =>
  endpoint<Geo>("/me", { signal });
