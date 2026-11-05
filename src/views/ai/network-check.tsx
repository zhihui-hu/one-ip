import { type ReactNode, useState } from "react";
import { LatencyBadge } from "@/components/latency-badge";
import { SiteLogo } from "@/components/site-logo";
import { IpText, Pending } from "@/components/toolkit";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useSortAnimation } from "@/hooks/use-sort-animation";
import { t } from "@/i18n";
import { trace } from "@/lib/network";
import { cn } from "@/lib/utils";
import { withDetectionAnimation } from "@/views/browser/with-feedback";
import { useQueries, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { aiPlatforms } from "./platforms";
import { probeAiDomain } from "./probe";

/** Below 640px each row collapses into a stacked card. */
const mobileCellClass = "max-sm:min-w-0 max-sm:p-0";

export function AiNetworkCheck({
  domains,
  children,
}: {
  domains: string[];
  children?: ReactNode;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const query = useQuery({
    queryKey: ["ai-network", "v3", ...domains],
    queryFn: ({ signal }) =>
      Promise.all(domains.map((domain) => probeAiDomain(domain, signal))),
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const platforms = domains.map((domain) =>
    aiPlatforms.find((platform) => platform.domain === domain),
  );
  const exits = useQueries({
    queries: platforms.map((platform, index) => ({
      queryKey: [platform?.id ?? domains[index], "exit"],
      enabled: Boolean(platform?.traceDomain),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        trace(platform!.traceDomain!, signal),
      staleTime: 60_000,
      retry: false,
      refetchOnWindowFocus: false,
    })),
  });
  const busy =
    refreshing || query.isFetching || exits.some((exit) => exit.isFetching);
  const orderedDomains = domains.map((domain, index) => ({
    domain,
    result: query.data?.[index],
    exit: exits[index],
  }));
  if (!busy && query.data)
    orderedDomains.sort(
      (a, b) => (a.result?.median ?? Infinity) - (b.result?.median ?? Infinity),
    );
  const sortRef = useSortAnimation(
    orderedDomains.map(({ domain }) => domain).join("|"),
  );
  return (
    <Card
      // `.sweep-shine` (index.css) is unlayered, so the faster cycle needs `!`.
      className="max-sm:min-w-0 [&_.sweep-shine]:[animation-duration:1s]!"
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{t("common.networkConnectivity")}</CardTitle>
          <button
            type="button"
            className="shrink-0 text-xs font-normal text-primary enabled:hover:underline underline-offset-4"
            disabled={busy}
            onClick={async () => {
              setRefreshing(true);
              try {
                const [next] = await withDetectionAnimation(() =>
                  Promise.all([
                    query.refetch({ throwOnError: true }),
                    ...exits
                      .filter((_, index) => platforms[index]?.traceDomain)
                      .map((exit) => exit.refetch()),
                  ]),
                );
                if (next.data?.every((result) => result.median != null))
                  toast.success(t("ai.networkCheckComplete"));
                else toast.warning(t("ai.checkCompleteSomeSitesDidNotRespond"));
              } catch {
                toast.error(t("ai.networkCheckFailedPleaseRetry"));
              } finally {
                setRefreshing(false);
              }
            }}
          >
            {busy ? (
              <Pending>{t("common.checking")}</Pending>
            ) : (
              t("common.runAgain")
            )}
          </button>
        </div>
      </CardHeader>
      <CardContent className="max-sm:min-w-0">
        <div ref={sortRef}>
          <Table className="max-sm:block max-sm:w-full">
            <TableHeader className="max-sm:hidden">
              <TableRow>
                <TableHead>{t("ai.domain")}</TableHead>
                <TableHead>{t("ai.egress")} IP</TableHead>
                <TableHead className="text-right">
                  {t("common.latency")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="max-sm:grid max-sm:w-full max-sm:gap-2">
              {orderedDomains.map(({ domain, result, exit }) => (
                <TableRow
                  key={domain}
                  data-sort-id={domain}
                  className="max-sm:grid max-sm:grid-cols-[minmax(0,1fr)_auto] max-sm:gap-2 max-sm:rounded-[10px] max-sm:border-0 max-sm:bg-muted max-sm:p-3 max-sm:hover:bg-muted"
                >
                  <TableCell
                    className={cn(
                      mobileCellClass,
                      "max-sm:col-[1] max-sm:row-[1] max-sm:whitespace-normal max-sm:wrap-anywhere",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <SiteLogo website={`https://${domain}`} />
                      <span>{domain}</span>
                    </span>
                  </TableCell>
                  <TableCell
                    className={cn(
                      mobileCellClass,
                      "text-muted-foreground max-sm:col-[1/-1] max-sm:row-[2] max-sm:text-[12px] max-sm:whitespace-normal max-sm:wrap-anywhere",
                    )}
                  >
                    <span className="sm:hidden">{t("common.egressIp")} </span>
                    {exit.isFetching ? (
                      <Pending>{t("common.checking")}</Pending>
                    ) : exit.data?.ip ? (
                      <IpText ip={exit.data.ip} />
                    ) : (
                      <span
                        title={t(
                          "ai.egressObtainedPossiblyDueCrossOriginConnectionRestrictions",
                        )}
                      >
                        {t("common.unavailable")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(
                      mobileCellClass,
                      "text-right max-sm:col-[2] max-sm:row-[1] max-sm:self-center",
                    )}
                  >
                    {query.isFetching ? (
                      <Pending>{t("common.checking")}</Pending>
                    ) : result?.median != null ? (
                      <span title={result.description}>
                        <LatencyBadge result={result} running={false} />
                      </span>
                    ) : (
                      <span
                        className="text-xs text-muted-foreground"
                        title={result?.description}
                      >
                        {result?.status === "restricted"
                          ? t("common.checkRestricted")
                          : t("ai.unconfirmed")}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-2 text-[0.78rem] text-muted-foreground">
          {t("ai.testsSiteResourceResponsesLoginChatAvailabilityCross")}
        </p>
        {query.error && (
          <p className="text-[0.78rem] text-destructive">
            {t("ai.networkCheckFailedPleaseRetryLabel")}
          </p>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
