import { endpoint, request } from "@/lib/network";
import type { DnsResult, DnsSession } from "@/lib/types";

export async function runDns(
  deep: boolean,
  signal: AbortSignal,
): Promise<DnsResult> {
  const session = await endpoint<DnsSession>("/dns/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deep }),
    signal,
  });
  await Promise.allSettled(
    session.probeUrls.map((url) =>
      request<void>(
        url,
        { mode: "no-cors", cache: "no-store", signal },
        "opaque",
      ),
    ),
  );
  for (let i = 0; i < (deep ? 15 : 8); i++) {
    signal.throwIfAborted();
    const result = await endpoint<DnsResult>(
      `/dns/result/${encodeURIComponent(session.token)}`,
      { signal },
    );
    if (result.complete) return result;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(
    "权威 DNS 未在规定时间内完成采样，请重试；无记录不代表没有泄露。",
  );
}
