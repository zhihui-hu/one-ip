import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ConnectivityTile, homeTargets } from "@/components/connectivity";
import { CountryFlag } from "@/components/country-flag";
import { IpText, Pending } from "@/components/toolkit";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UnderlineHover } from "@/components/underline-hover";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSortAnimation } from "@/hooks/use-sort-animation";
import { BrowserSummary } from "@/views/browser/summary";
import type { ProbeResult } from "@/views/link/api";
import { skipToken, useQueries } from "@tanstack/react-query";
import { getGeo, getBrowserIp } from "./api";
import { PlatformSummary } from "./platform-summary";
import { QuickChecks } from "./quick-checks";
import { SplitResults } from "./split-results";

export function HomePage() {
  const mobile = useIsMobile();
  const connectivity = useQueries({
    queries: homeTargets.map((target) => ({
      queryKey: ["connectivity", target.url, 0],
      enabled: false,
      queryFn: skipToken,
    })),
  });
  const orderedTargets = homeTargets.map((target, index) => ({
    target,
    query: connectivity[index],
  }));
  if (
    connectivity.every(
      (query) => !query.isFetching && (query.isSuccess || query.isError),
    )
  ) {
    orderedTargets.sort((a, b) => {
      const left =
        (a.query.data as ProbeResult | undefined)?.median ?? Infinity;
      const right =
        (b.query.data as ProbeResult | undefined)?.median ?? Infinity;
      return left - right;
    });
  }

  const connectivityRef = useSortAnimation(
    `${mobile}-${orderedTargets.map(({ target }) => target.name).join("|")}`,
  );
  useEffect(() => {
    document.title = "概览 - IP 网络工具";
  }, []);
  const primary = useQueries({
    queries: ([4, 6] as const).map((version) => ({
      queryKey: ["browser-ip", version],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getBrowserIp(version, signal),
      retry: false,
      staleTime: 60_000,
    })),
  });
  const ips = [
    ...new Set(primary.flatMap((query) => (query.data ? [query.data.ip] : []))),
  ];
  const geoQueries = useQueries({
    queries: ips.map((ip) => ({
      queryKey: ["geoip", ip],
      queryFn: ({ signal }: { signal: AbortSignal }) => getGeo(ip, signal),
      staleTime: 60_000,
      retry: false,
    })),
  });
  const geoByIp = new Map(ips.map((ip, index) => [ip, geoQueries[index]]));
  return (
    <div className="home-page">
      <h1 className="sr-only">网络概览</h1>
      <div className="home-overview home-ip-overview">
        {primary.map((query, index) => {
          if (index === 1 && !query.isPending && !query.data) return null;
          const geo = query.data
            ? { ...query.data, ...geoByIp.get(query.data.ip)?.data }
            : undefined;
          const loading =
            query.isPending ||
            Boolean(query.data && geoByIp.get(query.data.ip)?.isPending);
          return (
            <Card key={index} className="home-primary-card">
              <CardContent className="primary-ip-block">
                <div className="row-between eyebrow">
                  <span>当前出口 · IPv{index === 0 ? 4 : 6}</span>
                  <CountryFlag code={geo?.country_code} />
                </div>
                <div className="ip-value">
                  {query.isPending ? (
                    <Pending>加载中...</Pending>
                  ) : geo ? (
                    <IpText ip={geo.ip} />
                  ) : (
                    <span className="muted">
                      未获取到 IPv{index === 0 ? 4 : 6}
                    </span>
                  )}
                </div>
                <div className="primary-ip-meta text-sm text-muted-foreground">
                  {loading ? (
                    <Pending>正在查询归属信息…</Pending>
                  ) : geo?.country || geo?.city || geo?.isp ? (
                    <>
                      <p>
                        {[geo.country, geo.region, geo.city]
                          .filter(Boolean)
                          .filter((item, i, all) => all.indexOf(item) === i)
                          .join(" · ")}
                      </p>
                      <p className="mt-1 text-xs">
                        {[geo.isp, geo.asn ? `AS${geo.asn}` : undefined]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </>
                  ) : query.data ? (
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span>归属信息暂不可用</span>
                      <button
                        type="button"
                        className="shrink-0 text-primary"
                        onClick={() => geoByIp.get(query.data!.ip)?.refetch()}
                      >
                        重试
                      </button>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
        <Card className="home-connectivity-card">
          <CardHeader>
            <div className="row-between">
              <CardTitle>网络连通性</CardTitle>
              <UnderlineHover asChild>
                <Link className="small muted" to="/network/connectivity/">
                  查看更多 ›
                </Link>
              </UnderlineHover>
            </div>
          </CardHeader>
          <CardContent>
            <div ref={connectivityRef}>
              <div className="ping-grid">
                {orderedTargets.map(({ target }) => (
                  <ConnectivityTile target={target} key={target.name} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <SplitResults summary />
      <PlatformSummary />
      <QuickChecks />
      <BrowserSummary />
      <section className="home-shortcuts">
        <h2>快捷入口</h2>
        <div>
          {[
            { path: "/network", label: "网络检测" },
            { path: "/browser", label: "浏览器检测" },
            { path: "/ai", label: "AI 检测" },
            { path: "/status", label: "服务状态" },
          ].map((tool) => (
            <Link key={tool.path} to={tool.path}>
              {tool.label}
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
export default HomePage;
