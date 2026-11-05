import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CountryFlag } from "@/components/country-flag";
import { SiteLogo } from "@/components/site-logo";
import { IpText, Pending, ActionButton } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { UnderlineHover } from "@/components/underline-hover";
import { t } from "@/i18n";
import { countryName } from "@/lib/country";
import { sameIp } from "@/lib/ip-address";
import { useQueries } from "@tanstack/react-query";
import { type Row, SiteEgressTable } from "./site-egress-table";
import { sites } from "./sites";
import { getDomesticIp, getGeo, inspectSite } from "../api";
import { matchesSiteCategory } from "../category-status";
import { ExitGroups, type SiteFilter } from "../exit-groups";

export function SplitResults({ summary = false }: { summary?: boolean }) {
  const [round, setRound] = useState(0);
  const [detailName, setDetailName] = useState<string | null>(null);
  const [detailIp, setDetailIp] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [filter, setFilter] = useState<SiteFilter | null>(null);
  const [visibleSites, setVisibleSites] = useState<Set<string>>(
    () => new Set(),
  );
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisibleSites(new Set(sites.map((site) => site.name)));
        observer.disconnect();
      }
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [summary]);
  const [domestic] = useQueries({
    queries: [
      {
        queryKey: ["home-domestic-ip", 3],
        queryFn: ({ signal }: { signal: AbortSignal }) => getDomesticIp(signal),
        enabled: visibleSites.size > 0,
        staleTime: 60_000,
        retry: false,
      },
    ],
  });
  const inspectionQueries = useQueries({
    queries: sites.map((site) => ({
      queryKey: ["split", site.name, round],
      enabled: visibleSites.has(site.name),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        inspectSite(site, signal),
      staleTime: 60_000,
      retry: false,
    })),
  });
  const ips = [
    ...new Set(
      [
        ...inspectionQueries.filter((_, index) =>
          visibleSites.has(sites[index].name),
        ),
      ].flatMap((query) => (query.data?.geo ? [query.data.geo.ip] : [])),
    ),
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
  const rows: Row[] = sites.map((site, i) => ({
    ...site,
    onDetail: setDetailName,
    visible: visibleSites.has(site.name),
    geo: inspectionQueries[i].data?.geo
      ? {
          ...inspectionQueries[i].data.geo,
          ...geoByIp.get(inspectionQueries[i].data.geo.ip)?.data,
        }
      : undefined,
    pending: inspectionQueries[i].isFetching || inspectionQueries[i].isPending,
    reachable: inspectionQueries[i].data?.reachable,
    geoPending:
      inspectionQueries[i].isPending ||
      Boolean(
        inspectionQueries[i].data?.geo &&
        geoByIp.get(inspectionQueries[i].data.geo.ip)?.isPending,
      ),
  }));
  const groupedRows = [...rows].sort((a, b) => {
    const aBlocked = a.visible && !a.pending && a.reachable === false;
    const bBlocked = b.visible && !b.pending && b.reachable === false;
    return Number(bBlocked) - Number(aBlocked);
  });
  const categoryRows = rows.filter((row) => matchesSiteCategory(row, category));
  const filteredRows = filter
    ? categoryRows.filter((row) =>
        filter.kind === "site"
          ? row.name === filter.value
          : row.geo?.ip === filter.value,
      )
    : categoryRows;
  const exits = [
    ...new Map(
      rows.flatMap((row) => (row.geo ? [[row.geo.ip, row.geo] as const] : [])),
    ).values(),
  ];
  const collected = rows.filter((row) => row.geo).length;
  const locationGroups = new Map<
    string,
    {
      geo: NonNullable<Row["geo"]>;
      addresses: NonNullable<Row["geo"]>[];
      items: Row[];
      route: "direct" | "proxy" | "unknown";
    }
  >();
  for (const geo of exits) {
    const references = [
      ...(domestic.data ? [domestic.data.ip] : []),
      ...rows.flatMap((row) =>
        row.type === "domestic" && row.geo ? [row.geo.ip] : [],
      ),
    ].filter((ip) => ip.includes(":") === geo.ip.includes(":"));
    const route = references.some((ip) => sameIp(ip, geo.ip))
      ? "direct"
      : references.length
        ? "proxy"
        : "unknown";
    const location = [geo.country_code ?? geo.country, geo.region, geo.city];
    const key = JSON.stringify([
      location.some(Boolean) ? location : geo.ip,
      geo.asn ?? geo.isp ?? geo.ip,
      route,
    ]);
    const group = locationGroups.get(key) ?? {
      geo,
      addresses: [],
      items: [],
      route,
    };
    group.addresses.push(geo);
    group.items.push(...rows.filter((row) => row.geo?.ip === geo.ip));
    locationGroups.set(key, group);
  }
  const exitRows = [...locationGroups].sort(
    ([, a], [, b]) => b.items.length - a.items.length,
  );
  const selectedGroup = detailIp ? locationGroups.get(detailIp) : undefined;
  const detail = rows.find((row) => row.name === detailName);
  const pending = inspectionQueries.some((query) => query.isFetching);
  const Container = summary ? Card : "div";
  const Content = summary ? CardContent : "div";
  return (
    <Container ref={container} className="mb-3">
      {summary && (
        <CardHeader>
          <div className="row-between">
            <CardTitle>{t("home.websiteEgressRouting")}</CardTitle>
            <UnderlineHover asChild>
              <Link className="small muted" to="/network/connectivity">
                {t("home.viewAll")}
              </Link>
            </UnderlineHover>
          </div>
        </CardHeader>
      )}
      <Content>
        {summary ? (
          <div className="egress-summary">
            {exitRows.map(([key, { geo, addresses, items, route }]) => (
              <button
                type="button"
                key={key}
                className="egress-summary-row"
                onClick={() => {
                  setDetailName(null);
                  setDetailIp(key);
                }}
              >
                <CountryFlag code={geo.country_code} size="lg" />
                <span className="egress-summary-main">
                  <span className="egress-summary-location">
                    <span className={`egress-route egress-route-${route}`}>
                      {t(
                        `home.route${route === "direct" ? "Direct" : route === "proxy" ? "Proxy" : "Unknown"}`,
                      )}
                    </span>
                    <span className="egress-summary-location-name">
                      {[
                        countryName(geo.country_code) ?? geo.country,
                        geo.city,
                        geo.isp,
                      ]
                        .filter(Boolean)
                        .filter((item, i, all) => all.indexOf(item) === i)
                        .join(" · ") ||
                        t("common.locationDetailsAreUnavailable")}
                    </span>
                  </span>
                  <span className="egress-summary-addresses">
                    {addresses.map((address) => (
                      <span key={address.ip} className="egress-summary-address">
                        <span className="muted">
                          {address.ip.includes(":") ? "IPv6" : "IPv4"}
                        </span>{" "}
                        <IpText ip={address.ip} link={false} />
                      </span>
                    ))}
                  </span>
                </span>
                <span className="egress-summary-logos" aria-hidden="true">
                  {items.slice(0, 5).map((row) => (
                    <SiteLogo key={row.name} src={row.icon} />
                  ))}
                </span>
                <span className="egress-summary-count">
                  <strong>{items.length}</strong> {t("home.sites")}
                </span>
                <span className="egress-summary-bar" aria-hidden="true">
                  <span
                    style={{
                      width: `${(items.length / Math.max(collected, 1)) * 100}%`,
                    }}
                  />
                </span>
              </button>
            ))}
            <p className="home-note">{t("home.routeInferenceNote")}</p>
            <p className="home-note">
              {pending ? (
                <Pending>{t("home.checkingRoutedEgress")}</Pending>
              ) : (
                t("home.egressCollectedForSites", [
                  collected,
                  sites.length,
                  !exits.length ? t("home.noResultsToDisplayYet") : "",
                ])
              )}
            </p>
          </div>
        ) : (
          <>
            <div className="split-results-heading">
              <div className="min-w-0 flex items-baseline gap-2">
                <h2>{t("home.websiteEgressRouting")}</h2>
                {filter && (
                  <span>
                    {t(filter.kind === "site" ? "common.website" : "common.ip")}{" "}
                    · {filter.value}
                  </span>
                )}
              </div>
              <ActionButton
                size="sm"
                busy={pending}
                onClick={() => {
                  setDetailName(null);
                  setDetailIp(null);
                  setFilter(null);
                  setVisibleSites(new Set(sites.map((site) => site.name)));
                  setRound((value) => value + 1);
                }}
              >
                {pending ? t("common.checkingDots") : t("common.runAgain")}
              </ActionButton>
            </div>
            <ExitGroups
              rows={groupedRows}
              category={category}
              onCategoryChange={(value) => {
                setCategory(value);
                setFilter(null);
              }}
              onSelect={setDetailName}
              onFilter={setFilter}
              activeFilter={filter}
            />
            <SiteEgressTable
              rows={filteredRows}
              filter={filter}
              onClearFilter={() => setFilter(null)}
            />
          </>
        )}
      </Content>
      <ResponsiveDialog
        open={detailName !== null || detailIp !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailName(null);
            setDetailIp(null);
          }
        }}
        title={detail?.name ?? t("home.egressSite")}
        description={
          detail
            ? t("home.egressInformationObservedByThisSite")
            : t("home.sitesUsingEgressClickNameDetails")
        }
      >
        {detail ? (
          <div className="space-y-3 text-sm">
            <p className="break-all text-muted-foreground">
              {detail.domain ?? detail.url ?? detail.name}
            </p>
            <div>
              {t("common.egressIp")}
              {detail.geo?.ip ? (
                <IpText ip={detail.geo.ip} />
              ) : (
                t("home.egressIpWasNotReadable")
              )}
            </div>
            <p>
              {[detail.geo?.country, detail.geo?.city, detail.geo?.isp]
                .filter(Boolean)
                .join(" · ") || t("common.locationDetailsAreUnavailable")}
            </p>
            <p className="text-muted-foreground">
              {detail.pending
                ? t("common.checking")
                : detail.reachable === false
                  ? t("home.websiteAccessBlockedLabel")
                  : detail.geo
                    ? t("home.egressCollected")
                    : (detail.note ??
                      t("home.websiteReachableButEgressIpWasNotReadable"))}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedGroup?.addresses.map((geo) => (
              <div key={geo.ip}>
                <IpText ip={geo.ip} />
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              {(selectedGroup?.items ?? []).map((row) => (
                <Badge
                  key={row.name}
                  variant="secondary"
                  className="h-auto max-w-full gap-1.5 px-2.5 py-1.5 hover:bg-accent hover:text-accent-foreground [&_.site-icon]:size-3.5"
                  asChild
                >
                  <button type="button" onClick={() => setDetailName(row.name)}>
                    <SiteLogo src={row.icon} />
                    <span className="min-w-0 truncate">{row.name}</span>
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </ResponsiveDialog>
    </Container>
  );
}
