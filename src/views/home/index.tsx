import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ConnectivityTile, homeTargets } from "@/components/connectivity";
import { SponsorLinks } from "@/components/sponsor-links";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { UnderlineHover } from "@/components/underline-hover";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSortAnimation } from "@/hooks/use-sort-animation";
import { t } from "@/i18n";
import { BrowserSummary } from "@/views/browser/summary";
import { lookupIp } from "@/views/ip/api";
import { testConnectivity } from "@/views/link/api";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { RotateCw } from "lucide-react";
import { getGeo, getBrowserIp, getDomesticIp } from "./api";
import { HomeShortcuts } from "./components/home-shortcuts";
import { IpOverviewCard } from "./components/ip-overview-card";
import { AiAccessSummary, PlatformSummary } from "./platform-summary";
import { SplitResults } from "./split-results";

export function HomePage() {
  const mobile = useIsMobile();
  const client = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [sortBySpeed, setSortBySpeed] = useState(false);
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
  if (sortBySpeed)
    orderedTargets.sort(
      (a, b) =>
        (a.query.data?.median ?? Infinity) - (b.query.data?.median ?? Infinity),
    );

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
        </div>
        <div className="home-toolbar-actions">
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
        {cards.map(({ query, data, version, label }) => (
          <IpOverviewCard
            key={label}
            label={label}
            version={version}
            data={data}
            pending={!data && query.isPending}
            geoQuery={data ? geoByIp.get(data.ip) : undefined}
            typeQuery={data ? typeByIp.get(data.ip) : undefined}
          />
        ))}
      </div>
      <div className="home-network-overview">
        <AiAccessSummary />
        <Card className="home-connectivity-card">
          <CardHeader>
            <div className="row-between flex-wrap">
              <CardTitle>{t("common.networkConnectivity")}</CardTitle>
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
                  <Switch
                    size="sm"
                    checked={sortBySpeed}
                    onCheckedChange={setSortBySpeed}
                    aria-label={t("home.sortBySpeed")}
                  />
                  <span>{t("home.sortBySpeed")}</span>
                </label>
                <UnderlineHover asChild>
                  <Link
                    className="small muted whitespace-nowrap"
                    to="/network/connectivity/"
                  >
                    {t("home.viewMore")}
                  </Link>
                </UnderlineHover>
              </div>
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
