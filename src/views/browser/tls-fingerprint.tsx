import { ActionButton, Facts, Pending, ToolCard } from "@/components/toolkit";
import { t } from "@/i18n";
import { endpoint } from "@/lib/network";
import { useQuery } from "@tanstack/react-query";

export function TlsFingerprint() {
  const query = useQuery({
    queryKey: ["browser-tls-fingerprint"],
    queryFn: ({ signal }) =>
      endpoint<{
        ja3: string | null;
        ja4: string | null;
        tlsVersion: string | null;
        tlsCipher: string | null;
      }>("/browser/tls-fingerprint", { signal, cache: "no-store" }),
    retry: false,
    refetchOnWindowFocus: false,
  });
  return (
    <ToolCard title="JA3 / JA4">
      <ActionButton
        size="sm"
        variant="outline"
        busy={query.isFetching}
        onClick={() => void query.refetch()}
      >
        {t("重新检测")}
      </ActionButton>
      {query.isFetching ? (
        <Pending>{t("检测中…")}</Pending>
      ) : query.isError ? (
        <p className="mt-2 text-sm text-destructive">
          {t("TLS 指纹接口请求失败，请重试。")}
        </p>
      ) : (
        <>
          <Facts
            rows={[
              ["JA3", query.data?.ja3 ?? t("平台未提供")],
              ["JA4", query.data?.ja4 ?? t("平台未提供")],
              ["TLS", query.data?.tlsVersion ?? "—"],
              [t("加密套件"), query.data?.tlsCipher ?? "—"],
            ]}
          />
          {(!query.data?.ja3 || !query.data?.ja4) && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t(
                "JA3/JA4 需 Cloudflare Enterprise Bot Management；本地环境或平台未提供字段时无法显示。",
              )}
            </p>
          )}
        </>
      )}
    </ToolCard>
  );
}
