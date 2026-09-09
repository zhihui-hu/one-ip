import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ConnectivityTile, homeTargets } from "@/components/connectivity";
import { PageHeading, DataTable, IpText, Pending } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UnderlineHover } from "@/components/underline-hover";
import { flag } from "@/lib/network";
import type { Geo } from "@/lib/types";
import { useQueries, useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { detectSite, getMyIp, type Site } from "./api";
import sites from "./sites.json";

interface Row extends Site {
  geo?: Geo;
  pending: boolean;
}
const columns: ColumnDef<Row>[] = [
  {
    accessorKey: "name",
    header: "Website",
    cell: ({ row }) => (
      <div className="site-cell">
        <img
          className="site-icon"
          src={row.original.icon}
          alt=""
          onError={(e) => {
            e.currentTarget.style.visibility = "hidden";
          }}
        />
        <span>{row.original.name}</span>
        <Badge
          variant="secondary"
          className={
            row.original.type === "domestic"
              ? "tag-domestic"
              : "tag-international"
          }
        >
          {row.original.type === "domestic" ? "国内" : "国际"}
        </Badge>
      </div>
    ),
  },
  {
    id: "flag",
    header: "",
    cell: ({ row }) =>
      row.original.geo ? flag(row.original.geo.country_code) : "",
  },
  {
    id: "ip",
    header: "IP",
    cell: ({ row }) =>
      row.original.pending ? <Pending /> : <IpText ip={row.original.geo?.ip} />,
  },
  {
    id: "geo",
    header: "Geolocation",
    cell: ({ row }) => (
      <span className="muted">
        {row.original.pending ? (
          <Pending>查询中…</Pending>
        ) : row.original.geo ? (
          [
            row.original.geo.country,
            row.original.geo.city,
            row.original.geo.isp,
          ]
            .filter(Boolean)
            .join(" · ") || "归属地未知"
        ) : (
          "未知（跨域限制或连接失败）"
        )}
      </span>
    ),
  },
];
export function HomePage() {
  const me = useQuery({
    queryKey: ["my-ip"],
    queryFn: ({ signal }) => getMyIp(signal),
    retry: false,
  });
  const queries = useQueries({
    queries: sites.map((site) => ({
      queryKey: ["split", site.name],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        detectSite(site, signal),
      staleTime: 60_000,
      retry: false,
    })),
  });
  const rows: Row[] = sites.map((site, i) => ({
    ...site,
    geo: queries[i].data,
    pending: queries[i].isPending,
  }));
  const exits = useMemo(
    () => [
      ...new Map(
        queries.flatMap((q) => (q.data ? [[q.data.ip, q.data] as const] : [])),
      ).values(),
    ],
    [queries],
  );
  const pending = queries.some((q) => q.isPending);
  return (
    <>
      <PageHeading
        title="我的 IP 查询"
        description="查看当前的 IP地址、地理位置 、网络连通性和 IP分流"
        privacy
      />
      <section className="ip-card">
        <div className="ip-card-top">
          <div className="ip-info">
            <div className="eyebrow">
              {me.data?.ip.includes(":") ? "IPv6" : "IPv4"}
            </div>
            <div className="ip-value">
              {me.isPending ? (
                <Pending>正在查询 IP…</Pending>
              ) : (
                <IpText ip={me.data?.ip} />
              )}
            </div>
            <div className="ip-geo">
              {me.data ? (
                `${flag(me.data.country_code)} ${[me.data.country, me.data.city, me.data.isp].filter(Boolean).join(" ")}`
              ) : me.isError ? (
                "本机 IP 查询失败，请确认 Worker 已启动"
              ) : (
                <Pending>查询归属地…</Pending>
              )}
            </div>
            <div className="ip-source">数据来源：Cloudflare · 当前连接出口</div>
          </div>
          <div className="ping-col">
            <div className="eyebrow row-between">
              网络连通性
              <UnderlineHover asChild>
                <Link to="/link/">查看更多 ›</Link>
              </UnderlineHover>
            </div>
            <div className="ping-grid">
              {homeTargets.map((target) => (
                <ConnectivityTile target={target} key={target.name} />
              ))}
            </div>
          </div>
        </div>
        <div className="split-summary">
          <p>分流出口 IP 汇总（点击查询 IP 质量）</p>
          <div className="split-grid">
            {exits.map((geo) => (
              <div className="split-cell" key={geo.ip}>
                {flag(geo.country_code)} <IpText ip={geo.ip} />
              </div>
            ))}
            {!exits.length && (
              <span className="muted">
                {pending ? (
                  <Pending>正在检测分流出口 IP…</Pending>
                ) : (
                  "未获取到可读取的出口 IP，可能受到浏览器跨域限制。"
                )}
              </span>
            )}
          </div>
        </div>
      </section>
      <Separator className="section-divider" />
      <header className="section-heading">
        <h2>网站分流测试</h2>
        <p>
          如果当前网络进行了IP分流，那么下面可以看到访问不同网站时所使用的IP
          及分流规则。如果出现“未知”状态，这并不代表你的网络有问题
        </p>
      </header>
      <DataTable data={rows} columns={columns} className="split-table" />
    </>
  );
}
export default HomePage;
