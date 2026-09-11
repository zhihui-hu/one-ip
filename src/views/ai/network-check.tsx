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
import { withDetectionAnimation } from "@/views/browser/with-feedback";
import { useQueries, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { aiPlatforms } from "./platforms";
import { probeAiDomain } from "./probe";

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
    <Card className="ai-network-check">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{t("网络连通性")}</CardTitle>
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
                  toast.success(t("网络检测完成"));
                else toast.warning(t("检测完成，部分站点未获取到响应"));
              } catch {
                toast.error(t("网络检测失败，请重试"));
              } finally {
                setRefreshing(false);
              }
            }}
          >
            {busy ? <Pending>{t("检测中…")}</Pending> : t("重新检测")}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={sortRef}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("域名")}</TableHead>
                <TableHead>{t("出口")} IP</TableHead>
                <TableHead className="text-right">{t("延迟")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedDomains.map(({ domain, result, exit }) => (
                <TableRow key={domain} data-sort-id={domain}>
                  <TableCell>
                    <span className="flex min-w-0 items-center gap-2">
                      <SiteLogo website={`https://${domain}`} />
                      <span>{domain}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {exit.isFetching ? (
                      <Pending>{t("检测中…")}</Pending>
                    ) : exit.data?.ip ? (
                      <IpText ip={exit.data.ip} />
                    ) : (
                      <span title={t("未获取到出口，可能受跨域或连接限制。")}>
                        {t("暂不可用")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {busy ? (
                      <Pending>{t("检测中…")}</Pending>
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
                          ? t("检测受限")
                          : t("未确认")}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="small muted mt-2">
          {t(
            "检测的是站点资源响应，不等于登录或对话可用；跨站限制和超时不会判为“未连通”。",
          )}
        </p>
        {query.error && (
          <p className="small text-destructive">
            {t("网络检测失败，请重试。")}
          </p>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
