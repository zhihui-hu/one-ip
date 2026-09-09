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
import type { Geo } from "@/lib/types";
import { useQueries } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { detectSite, getGeo, type Site } from "./api";
import sites from "./sites.json";

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
        {row.type === "domestic" ? "国内" : "国际"}
      </Badge>
    </div>
  );
}

const columns: ColumnDef<Row>[] = [
  {
    accessorKey: "name",
    header: "网站",
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
    header: "归属地",
    cell: ({ row }) => (
      <span className="muted">
        {!row.original.visible ? (
          "—"
        ) : row.original.geoPending ? (
          <Pending>查询中…</Pending>
        ) : row.original.geo ? (
          <CompactText
            text={
              [
                row.original.geo.country,
                row.original.geo.city,
                row.original.geo.isp,
              ]
                .filter(Boolean)
                .join(" · ") || "归属地未知"
            }
          />
        ) : (
          <CompactText text="未知（跨域限制或连接失败）" />
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
          <CardTitle>网站分流出口</CardTitle>
          {summary && (
            <Link className="small muted" to="/network/connectivity?view=exits">
              查看全部 ›
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
                    className="shrink-0 text-primary"
                    onClick={() => {
                      setDetailName(null);
                      setDetailIp(geo.ip);
                    }}
                  >
                    {rows.filter((row) => row.geo?.ip === geo.ip).length} 个站点
                  </button>
                </UnderlineHover>
              </div>
            ))}
            <p className="small muted col-span-full pt-1">
              {pending ? (
                <Pending>正在检测分流出口…</Pending>
              ) : (
                `已读取 ${rows.filter((row) => row.geo).length}/${sites.length} 个站点的出口${!exits.length ? "，暂无可显示结果" : ""}`
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
        title={detail?.name ?? "出口站点"}
        description={
          detail
            ? "该站点观察到的出口信息。"
            : "使用此出口的站点，点击名称查看详情。"
        }
      >
        {detail ? (
          <div className="space-y-3 text-sm">
            <div>
              出口 IP：
              <IpText ip={detail.geo?.ip} />
            </div>
            <p>
              {[detail.geo?.country, detail.geo?.city, detail.geo?.isp]
                .filter(Boolean)
                .join(" · ") || "归属信息暂不可用"}
            </p>
            <p className="text-muted-foreground">
              {detail.pending
                ? "检测中…"
                : detail.geo
                  ? "已读取出口"
                  : "未获取到出口，可能受跨域或连接限制。"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <IpText ip={detailIp ?? undefined} />
            {rows
              .filter((row) => row.geo?.ip === detailIp)
              .map((row) => (
                <div key={row.name} className="flex items-center gap-2 text-sm">
                  <SiteLogo src={row.icon} />
                  <UnderlineHover asChild>
                    <button
                      type="button"
                      className="text-primary"
                      onClick={() => setDetailName(row.name)}
                    >
                      {row.name}
                    </button>
                  </UnderlineHover>
                </div>
              ))}
          </div>
        )}
      </ResponsiveDialog>
    </Card>
  );
}
