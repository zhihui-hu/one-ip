import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ConnectivityTile, homeTargets } from "@/components/connectivity";
import { SponsorLinks } from "@/components/sponsor-links";
import { PrivacyToggle } from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UnderlineHover } from "@/components/underline-hover";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSortAnimation } from "@/hooks/use-sort-animation";
import { t } from "@/i18n";
import { BrowserSummary } from "@/views/browser/summary";
import { lookupIp } from "@/views/ip/api";
import { testConnectivity, type ProbeResult } from "@/views/link/api";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { RotateCw } from "lucide-react";
import { getGeo, getBrowserIp, getDomesticIp } from "./api";
import { HomeShortcuts } from "./components/home-shortcuts";
import { IpOverviewCard } from "./components/ip-overview-card";
import { IpSearch } from "./components/ip-search";
import { PlatformSummary } from "./platform-summary";
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
    document.title = t("home.overviewIpTools");
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
        label:
          index === 0
            ? t("home.ipv4DomesticProbe")
            : t("home.ipv4ExternalProbe"),
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
      <SponsorLinks />
      <div className="home-toolbar">
        <div className="home-toolbar-heading">
          <h1>{t("home.networkOverview")}</h1>
          <PrivacyToggle iconOnly />
        </div>
        <div className="home-toolbar-actions">
          <IpSearch />
          <Button
            variant="ghost"
            size="icon"
            className="home-refresh"
            disabled={refreshing}
            aria-busy={refreshing}
            aria-label={
              refreshing ? t("common.checkingDots") : t("common.runAgain")
            }
            title={t("common.runAgain")}
            onClick={refresh}
          >
            <RotateCw
              aria-hidden="true"
              className={refreshing ? "animate-spin" : undefined}
            />
          </Button>
        </div>
      </div>
      <div className="home-overview home-ip-overview">
        {cards.map(({ query, data, version, label }, index) => (
          <IpOverviewCard
            key={index}
            label={label}
            version={version}
            data={data}
            pending={!data && query.isPending}
            geoQuery={geoByIp.get(data.ip)}
            typeQuery={typeByIp.get(data.ip)}
          />
        ))}
        <Card className="home-connectivity-card">
          <CardHeader>
            <div className="row-between">
              <CardTitle>{t("common.networkConnectivity")}</CardTitle>
              <UnderlineHover asChild>
                <Link className="small muted" to="/network/connectivity/">
                  {t("home.viewMore")}
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
      <BrowserSummary />
      <HomeShortcuts />
    </div>
  );
}
export default HomePage;
