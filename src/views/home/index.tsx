import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ConnectivityTile, homeTargets } from "@/components/connectivity";
import { CountryFlag } from "@/components/country-flag";
import { NumberTicker } from "@/components/number-ticker";
import { ActionButton, IpText, Pending } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UnderlineHover } from "@/components/underline-hover";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSortAnimation } from "@/hooks/use-sort-animation";
import { t } from "@/i18n";
import { companyTypeColors } from "@/lib/ip-badge-colors";
import { ipScoreColor } from "@/lib/ip-score";
import { BrowserSummary } from "@/views/browser/summary";
import { lookupIp } from "@/views/ip/api";
import { testConnectivity, type ProbeResult } from "@/views/link/api";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  Fingerprint,
  Globe2,
  Network,
  Search,
  ShieldCheck,
} from "lucide-react";
import { getGeo, getBrowserIp, getDomesticIp } from "./api";
import { PlatformSummary } from "./platform-summary";
import { QuickChecks } from "./quick-checks";
import { SplitResults } from "./split-results";

export function HomePage() {
  const mobile = useIsMobile();
  const client = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    const filters = {
      predicate: (query: { queryKey: readonly unknown[] }) =>
        [
          "home-domestic-ip",
          "browser-ip",
          "split",
          "geoip",
          "lookup-ip-coffee",
          "connectivity",
          "connectivity-progress",
          "ai-preview",
          "service-status",
          "home-dns",
          "home-webrtc",
          "webrtc-diagnostic",
          "home-browser-fingerprint",
        ].includes(String(query.queryKey[0])),
    };
    try {
      await client.cancelQueries(filters);
      await client.resetQueries(filters);
    } finally {
      setRefreshing(false);
    }
  };
  const connectivity = useQueries({
    queries: homeTargets.map((target) => ({
      queryKey: ["connectivity", target.url, 0],
      enabled: false,
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        testConnectivity(target.url, signal, (result) =>
          client.setQueryData(["connectivity-progress", target.url, 0], result),
        ),
      retry: false,
      staleTime: 60_000,
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
    document.title = t("概览 - IP 网络工具");
  }, []);
  const probes = useQueries({
    queries: [
      {
        queryKey: ["home-domestic-ip", 3],
        retry: false,
        queryFn: ({ signal }: { signal: AbortSignal }) => getDomesticIp(signal),
      },
      {
        queryKey: ["browser-ip", 4],
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          getBrowserIp(4, signal),
      },
    ].map((probe) => ({ retry: false, staleTime: 60_000, ...probe })),
  });
  const cards = probes.flatMap((query, index) => {
    // Only dedicated probes belong in the overview; per-site routes stay in SplitResults.
    if (!query.data || query.data.ip.includes(":")) return [];
    if (index === 1 && query.data?.ip === probes[0].data?.ip) return [];
    return [
      {
        query,
        data: query.data,
        version: 4,
        label: index === 0 ? t("IPv4 · 国内探测") : t("IPv4 · 外部探测"),
      },
    ];
  });
  const ips = [
    ...new Set(cards.flatMap(({ data }) => (data ? [data.ip] : []))),
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
  const typeQueries = useQueries({
    queries: ips.map((ip) => ({
      queryKey: ["lookup-ip-coffee", ip],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        lookupIp(ip, AbortSignal.any([signal, AbortSignal.timeout(3000)])),
      staleTime: 3600_000,
      retry: false,
      refetchOnWindowFocus: false,
    })),
  });
  const typeByIp = new Map(ips.map((ip, index) => [ip, typeQueries[index]]));
  return (
    <div className="home-page">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-sm font-semibold">{t("网络概览")}</h1>
        <ActionButton
          size="sm"
          variant="outline"
          busy={refreshing}
          onClick={refresh}
        >
          {refreshing ? t("检测中...") : t("重新检测")}
        </ActionButton>
      </div>
      <div className="home-overview home-ip-overview">
        {cards.map(({ query, data, version, label }, index) => {
          const pending = !data && query.isPending;
          const geo = data
            ? { ...data, ...geoByIp.get(data.ip)?.data }
            : undefined;
          const classification = data ? typeByIp.get(data.ip) : undefined;
          const company = classification?.isSuccess
            ? classification.data.coffee
            : undefined;
          const score = company?.trust_score;
          const hasScore =
            typeof score === "number" &&
            Number.isFinite(score) &&
            score >= 0 &&
            score <= 100;
          const typeLabels = company
            ? [
                company.company_type
                  ? {
                      label: company.company_type,
                      color:
                        companyTypeColors[company.company_type.toLowerCase()] ??
                        "bg-primary/5 text-primary dark:bg-primary/10",
                    }
                  : null,
                company.is_public_service === true
                  ? {
                      label: t("公共服务"),
                      color: "bg-primary/15 text-primary dark:bg-primary/20",
                    }
                  : null,
                company.isResidential === true && !company.is_public_service
                  ? {
                      label: t("家庭住宅 IP"),
                      color: "bg-primary/25 text-primary dark:bg-primary/30",
                    }
                  : null,
                company.is_datacenter === true && !company.is_public_service
                  ? {
                      label: t("机房 IP"),
                      color: "bg-primary/5 text-primary dark:bg-primary/10",
                    }
                  : null,
                company.is_mobile === true
                  ? {
                      label: t("移动网络"),
                      color: "bg-primary/15 text-primary dark:bg-primary/20",
                    }
                  : null,
                company.is_proxy === true ||
                company.is_vpn === true ||
                company.is_tor === true
                  ? {
                      label: t("代理 / VPN / Tor"),
                      color: "bg-primary/10 text-primary dark:bg-primary/15",
                    }
                  : null,
              ].filter((item) => item !== null)
            : [];
          const loading =
            pending || Boolean(data && geoByIp.get(data.ip)?.isPending);
          return (
            <Card key={index} className="home-primary-card relative">
              {data && (
                <Link
                  to={`/network/ip/${encodeURIComponent(data.ip)}`}
                  aria-label={`${label} · ${t("IP 信息查询")}`}
                  className="absolute inset-0 z-10 rounded-[inherit] transition-colors hover:bg-primary/[0.025] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                />
              )}
              <CardContent className="primary-ip-block">
                <div className="row-between eyebrow">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span>{label}</span>
                    {typeLabels.map((type) => (
                      <Badge
                        key={type.label}
                        variant="secondary"
                        className={`h-4 px-1.5 text-[10px] font-medium tracking-normal ${type.color}`}
                      >
                        {type.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="home-address-row">
                  <div className="ip-value">
                    {pending ? (
                      <Pending>{t("加载中...")}</Pending>
                    ) : geo ? (
                      <>
                        <CountryFlag code={geo.country_code} />
                        <IpText ip={geo.ip} link={false} />
                      </>
                    ) : (
                      <span className="muted">
                        {t("未获取到 IPv")}
                        {version}
                      </span>
                    )}
                  </div>
                  {hasScore && (
                    <div
                      className="ip-reputation-badge shrink-0"
                      style={{ color: ipScoreColor(score) }}
                    >
                      <span>{t("IP 信誉分")}</span>
                      <strong>
                        <NumberTicker value={score} />
                      </strong>
                    </div>
                  )}
                </div>
                <div className="primary-ip-meta text-sm text-muted-foreground">
                  {loading ? (
                    <Pending>{t("正在查询归属信息…")}</Pending>
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
                  ) : data ? (
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span>{t("归属信息暂不可用")}</span>
                      <button
                        type="button"
                        className="relative z-20 shrink-0 text-primary"
                        onClick={() => geoByIp.get(data.ip)?.refetch()}
                      >
                        {t("重试")}
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
              <CardTitle>{t("网络连通性")}</CardTitle>
              <UnderlineHover asChild>
                <Link className="small muted" to="/network/connectivity/">
                  {t("查看更多 ›")}
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
      <Card className="home-shortcuts">
        <CardHeader>
          <CardTitle>{t("热门功能")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="shortcut-grid">
            {[
              { path: "/network/ip", label: t("IP 信息查询"), icon: Search },
              { path: "/network/ping", label: t("全球 Ping"), icon: Activity },
              { path: "/network/dns", label: t("DNS 出口"), icon: Network },
              {
                path: "/browser/privacy",
                label: t("WebRTC 检测"),
                icon: ShieldCheck,
              },
              {
                path: "/browser/fingerprint",
                label: t("浏览器指纹"),
                icon: Fingerprint,
              },
              { path: "/network/whois", label: t("WHOIS 查询"), icon: Globe2 },
            ].map((tool) => (
              <Link key={tool.path} to={tool.path}>
                <span className="shortcut-icon">
                  <tool.icon aria-hidden="true" />
                </span>
                <span className="shortcut-label">{tool.label}</span>
                <ArrowRight className="shortcut-arrow" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export default HomePage;
