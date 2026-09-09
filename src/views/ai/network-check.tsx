import { type ReactNode, useState } from "react";
import { LatencyBadge } from "@/components/latency-badge";
import { SiteLogo } from "@/components/site-logo";
import { Pending } from "@/components/toolkit";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useSortAnimation } from "@/hooks/use-sort-animation";
import { withDetectionAnimation } from "@/views/browser/with-feedback";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
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
  const busy = refreshing || query.isFetching;
  const orderedDomains = domains.map((domain, index) => ({
    domain,
    result: query.data?.[index],
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
          <CardTitle>网络连通性</CardTitle>
          <button
            type="button"
            className="shrink-0 text-xs font-normal text-primary enabled:hover:underline underline-offset-4"
            disabled={busy}
            onClick={async () => {
              setRefreshing(true);
              try {
                const next = await withDetectionAnimation(() =>
                  query.refetch({ throwOnError: true }),
                );
                if (next.data?.every((result) => result.median != null))
                  toast.success("网络检测完成");
                else toast.warning("检测完成，部分站点未获取到响应");
              } catch {
                toast.error("网络检测失败，请重试");
              } finally {
                setRefreshing(false);
              }
            }}
          >
            {busy ? <Pending>检测中…</Pending> : "重新检测"}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={sortRef}>
          {orderedDomains.map(({ domain, result }) => (
            <div
              key={domain}
              data-sort-id={domain}
              className="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <SiteLogo website={`https://${domain}`} />
                <span className="truncate">{domain}</span>
              </span>
              {busy ? (
                <Pending>检测中…</Pending>
              ) : result?.median != null ? (
                <span title={result.description}>
                  <LatencyBadge result={result} running={false} />
                </span>
              ) : (
                <span
                  className="text-xs text-muted-foreground"
                  title={result?.description}
                >
                  {result?.status === "restricted" ? "检测受限" : "未确认"}
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="small muted mt-2">
          检测的是站点资源响应，不等于登录或对话可用；跨站限制和超时不会判为“未连通”。
        </p>
        {query.error && (
          <p className="small text-destructive">网络检测失败，请重试。</p>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
