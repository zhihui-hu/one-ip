import { t } from "@/i18n";
import { request } from "@/lib/network";

export async function sampleDnsExit(signal: AbortSignal) {
  const token = crypto.randomUUID().replaceAll("-", "");
  const data = await request<{ dns?: { ip: string; geo: string } }>(
    `https://${token}.edns.ip-api.com/json`,
    { signal, cache: "no-store" },
  );
  signal.throwIfAborted();
  if (!data.dns?.ip) throw new Error(t("未获取到 DNS 出口"));
  return data.dns;
}
