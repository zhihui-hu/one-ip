import { t } from "@/i18n";
import type { SourceDefinition } from "./diagnostic-source.ts";
import { normalizePublicIp } from "./diagnostics.ts";
import { request, trace } from "./network.ts";
import type { Geo } from "./types.ts";

/** Executes a normalized source; scheduling and result history belong to the caller. */
export async function executeSource(
  source: SourceDefinition,
  signal?: AbortSignal,
): Promise<Geo> {
  signal?.throwIfAborted();
  if (source.execution === "link-only")
    throw new Error(t(source.note ?? "未获取到可读取的出口 IP"));
  const timeout = AbortSignal.timeout(3000);
  const options = {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    cache: "no-store" as const,
    credentials: "omit" as const,
  };
  let ip: unknown;
  let geo: Geo | undefined;
  switch (source.method) {
    case "cftrace":
      geo = await trace(source.domain, options.signal);
      ip = geo.ip;
      break;
    case "ip-json":
      ip = (await request<{ ip?: unknown }>(source.url, options)).ip;
      break;
    case "ip-text": {
      const html = await request<string>(source.url, options, "text");
      const text = html.replace(/<[^>]*>/g, " ");
      ip = text.match(
        /(?:IP(?:地址)?|ip)[^\d]{0,30}((?:\d{1,3}\.){3}\d{1,3})/i,
      )?.[1];
      break;
    }
    case "headers": {
      const headers = await request<Headers>(
        source.url,
        { ...options, method: "HEAD" },
        "headers",
      );
      ip = headers.get(source.responseHeader);
      break;
    }
    default: {
      const unsupported: never = source;
      throw new Error(`Unsupported source: ${String(unsupported)}`);
    }
  }
  const normalized = normalizePublicIp(ip);
  if (
    !normalized ||
    (source.addressFamily === "ipv4" && normalized.version !== 4) ||
    (source.addressFamily === "ipv6" && normalized.version !== 6)
  )
    throw new Error(t("未获取到可读取的出口 IP"));
  return { ...geo, ip: normalized.ip, source: geo?.source ?? source.name };
}
