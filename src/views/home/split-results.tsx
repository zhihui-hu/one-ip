import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CompactText } from "@/components/compact-text";
import { CountryFlag } from "@/components/country-flag";
import { SiteLogo } from "@/components/site-logo";
import { DataTable, IpText, Pending } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { UnderlineHover } from "@/components/underline-hover";
import { t } from "@/i18n";
import type { Geo } from "@/lib/types";
import { useQueries } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { detectSite, getGeo, type Site } from "./api";
import rawsites from "./sites.json";

const sites = rawsites.map((item) => ({ ...item, name: t(item.name) }));

interface Row extends Site {
  onDetail: (name: string) => void;
  visible: boolean;
  onVisible: (name: string) => void;
  geo?: Geo;
  pending: boolean;
  geoPending: boolean;
}
function VisibleSite({ row }: { row: Row }) {
  const ref = useRef<HTMLDivElement>(null);
  const { name, visible, onVisible } = row;
  useEffect(() => {
    if (visible || !ref.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        onVisible(name);
        observer.disconnect();
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [name, visible, onVisible]);
  return (
    <div ref={ref} className="site-cell">
      {visible ? <SiteLogo src={row.icon} /> : <span className="site-icon" />}
      <UnderlineHover asChild>
        <button
          type="button"
          className="min-w-0 truncate text-primary"
          onClick={() => row.onDetail(name)}
        >
          {name}
        </button>
      </UnderlineHover>
      <Badge
        variant="secondary"
        className={
          row.type === "domestic" ? "tag-domestic" : "tag-international"
        }
      >
        {row.type === "domestic" ? t("国内") : t("国际")}
      </Badge>
    </div>
  );
}

const columns: ColumnDef<Row>[] = [
  {
    accessorKey: "name",
    header: t("网站"),
    cell: ({ row }) => <VisibleSite row={row.original} />,
  },
  {
    id: "flag",
    header: "",
    cell: ({ row }) =>
      row.original.geo ? (
        <CountryFlag code={row.original.geo.country_code} />
      ) : (
        ""
      ),
  },
  {
    id: "ip",
    header: "IP",
    cell: ({ row }) =>
      !row.original.visible ? (
        "—"
      ) : row.original.pending ? (
        <Pending />
      ) : (
        <IpText ip={row.original.geo?.ip} />
      ),
  },
  {
    id: "geo",
    header: t("归属地"),
    cell: ({ row }) => (
      <span className="muted">
        {!row.original.visible ? (
          "—"
        ) : row.original.geoPending ? (
          <Pending>{t("查询中…")}</Pending>
        ) : row.original.geo ? (
          <CompactText
            text={
              [
                row.original.geo.country,
                row.original.geo.city,
                row.original.geo.isp,
              ]
                .filter(Boolean)
                .join(" · ") || t("归属地未知")
            }
          />
        ) : (
          <CompactText text={t("未知（跨域限制或连接失败）")} />
        )}
      </span>
    ),
  },
];
export function SplitResults({ summary = false }: { summary?: boolean }) {
  const [detailName, setDetailName] = useState<string | null>(null);
  const [detailIp, setDetailIp] = useState<string | null>(null);
  const [visibleSites, setVisibleSites] = useState<Set<string>>(
    () => new Set(),
  );
  const showSite = useCallback((name: string) => {
    setVisibleSites((previous) =>
      previous.has(name) ? previous : new Set(previous).add(name),
    );
  }, []);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!summary || !container.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisibleSites(new Set(sites.map((site) => site.name)));
        observer.disconnect();
      }
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [summary]);
  const queries = useQueries({
    queries: sites.map((site) => ({
      queryKey: ["split", site.name],
      enabled: visibleSites.has(site.name),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        detectSite(site, signal),
      staleTime: 60_000,
      retry: false,
    })),
  });
  const ips = [
    ...new Set(
      [
        ...queries.filter((_, index) => visibleSites.has(sites[index].name)),
      ].flatMap((query) => (query.data ? [query.data.ip] : [])),
    ),
  ];
  const geoQueries = useQueries({
    queries: ips.map((ip) => ({
      queryKey: ["geoip", ip, 1000],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getGeo(ip, signal, 1000),
      staleTime: 60_000,
      retry: false,
    })),
  });
  const geoByIp = new Map(ips.map((ip, index) => [ip, geoQueries[index]]));
  const rows: Row[] = sites.map((site, i) => ({
    ...site,
    onDetail: setDetailName,
    visible: visibleSites.has(site.name),
    onVisible: showSite,
    geo: queries[i].data
      ? { ...queries[i].data!, ...geoByIp.get(queries[i].data!.ip)?.data }
      : undefined,
    pending: queries[i].isPending,
    geoPending:
      queries[i].isPending ||
      Boolean(queries[i].data && geoByIp.get(queries[i].data!.ip)?.isPending),
  }));
  const exits = [
    ...new Map(
      rows.flatMap((row) => (row.geo ? [[row.geo.ip, row.geo] as const] : [])),
    ).values(),
  ];
  const detail = rows.find((row) => row.name === detailName);
  const pending = queries.some((q) => q.isFetching);
  return (
    <Card ref={container} className="mb-3">
      <CardHeader>
        <div className="row-between">
          <CardTitle>{t("网站分流出口")}</CardTitle>
          {summary && (
            <Link className="small muted" to="/network/connectivity?view=exits">
              {t("查看全部 ›")}
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {summary ? (
          <div className="grid grid-cols-1 items-start gap-x-4 gap-y-1 sm:grid-cols-2">
            {exits.map((geo) => (
              <div
                key={geo.ip}
                className="flex min-w-0 items-center gap-2 rounded-md bg-muted/30 px-2 py-1.5 text-xs"
              >
                <CountryFlag code={geo.country_code} />
                <span className="min-w-0 flex-1">
                  <IpText ip={geo.ip} />
                </span>
                <UnderlineHover asChild>
                  <button
                    type="button"
                    className="shrink-0 text-muted-foreground"
                    onClick={() => {
                      setDetailName(null);
                      setDetailIp(geo.ip);
                    }}
                  >
                    {rows.filter((row) => row.geo?.ip === geo.ip).length}
                    {t("个站点")}
                  </button>
                </UnderlineHover>
              </div>
            ))}
            <p className="home-note col-span-full pt-1">
              {pending ? (
                <Pending>{t("正在检测分流出口…")}</Pending>
              ) : (
                t("已读取 {0}/{1} 个站点的出口{2}", [
                  rows.filter((row) => row.geo).length,
                  sites.length,
                  !exits.length ? t("，暂无可显示结果") : "",
                ])
              )}
            </p>
          </div>
        ) : (
          <DataTable data={rows} columns={columns} className="split-table" />
        )}
      </CardContent>
      <ResponsiveDialog
        open={detailName !== null || detailIp !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailName(null);
            setDetailIp(null);
          }
        }}
        title={detail?.name ?? t("出口站点")}
        description={
          detail
            ? t("该站点观察到的出口信息。")
            : t("使用此出口的站点，点击名称查看详情。")
        }
      >
        {detail ? (
          <div className="space-y-3 text-sm">
            <div>
              {t("出口 IP：")}
              <IpText ip={detail.geo?.ip} />
            </div>
            <p>
              {[detail.geo?.country, detail.geo?.city, detail.geo?.isp]
                .filter(Boolean)
                .join(" · ") || t("归属信息暂不可用")}
            </p>
            <p className="text-muted-foreground">
              {detail.pending
                ? t("检测中…")
                : detail.geo
                  ? t("已读取出口")
                  : t("未获取到出口，可能受跨域或连接限制。")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <IpText ip={detailIp ?? undefined} />
            <div className="flex flex-wrap gap-2">
              {rows
                .filter((row) => row.geo?.ip === detailIp)
                .map((row) => (
                  <Badge
                    key={row.name}
                    variant="secondary"
                    className="h-auto max-w-full gap-1.5 px-2.5 py-1.5 hover:bg-accent hover:text-accent-foreground [&_.site-icon]:size-3.5"
                    asChild
                  >
                    <button
                      type="button"
                      onClick={() => setDetailName(row.name)}
                    >
                      <SiteLogo src={row.icon} />
                      <span className="min-w-0 truncate">{row.name}</span>
                    </button>
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </ResponsiveDialog>
    </Card>
  );
}
