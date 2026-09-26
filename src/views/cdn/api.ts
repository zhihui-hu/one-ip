import { t } from "@/i18n";
import { request } from "@/lib/network";
import { providers } from "./providers";

export async function checkCdnProvider(
  provider: (typeof providers)[number],
  signal: AbortSignal,
) {
  if ("trace" in provider || "text" in provider) {
    const text = await request<string>(
      provider.url,
      { signal, cache: "no-store" },
      "text",
    );
    const node =
      "trace" in provider
        ? text.match(/^colo=(.+)$/m)?.[1]?.trim()
        : text.trim();
    if (!node || node.length > 200 || node.includes("<"))
      throw new Error(t("未返回有效节点标识"));
    return { node, cache: "—" };
  }
  const headers = await request<Headers>(
    provider.url,
    { signal, method: "HEAD", cache: "no-store" },
    "headers",
  );
  const values = provider.headers.flatMap((key) => {
    const value = headers.get(key);
    if (!value) return [];
    if (key === "xcc") {
      try {
        return [`${key}: ${atob(value)}`];
      } catch {
        return [];
      }
    }
    if (key === "server" && !/bunnycdn-[\w-]+/i.test(value)) return [];
    return [`${key}: ${value}`];
  });
  if (!values.length) throw new Error(t("节点头未公开或跨域受限"));
  return {
    node: values.join(" · "),
    cache: headers.get("x-cache") ?? headers.get("cf-cache-status") ?? "—",
  };
}
