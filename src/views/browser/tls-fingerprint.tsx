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
        {t("common.runAgain")}
      </ActionButton>
      {query.isFetching ? (
        <Pending>{t("common.checking")}</Pending>
      ) : query.isError ? (
        <p className="mt-2 text-sm text-destructive">
          {t("browser.tlsFingerprintRequestFailedPleaseRetry")}
        </p>
      ) : (
        <>
          <Facts
            valueClassName="max-w-[70%]"
            rows={[
              ["JA3", query.data?.ja3 ?? t("browser.notProvidedByPlatform")],
              ["JA4", query.data?.ja4 ?? t("browser.notProvidedByPlatform")],
              ["TLS", query.data?.tlsVersion ?? "—"],
              [t("browser.cipherSuite"), query.data?.tlsCipher ?? "—"],
            ]}
          />
          {(!query.data?.ja3 || !query.data?.ja4) && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t(
                "browser.ja3Ja4RequiresCloudflareEnterpriseBotManagementValues",
              )}
            </p>
          )}
        </>
      )}
    </ToolCard>
  );
}
