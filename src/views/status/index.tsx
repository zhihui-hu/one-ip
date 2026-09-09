import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatedValue } from "@/components/animated-value";
import { NumberTicker } from "@/components/number-ticker";
import { SiteLogo } from "@/components/site-logo";
import {
  PageHeading,
  Pending,
  ToolCard,
  DataTable,
} from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { UnderlineHover } from "@/components/underline-hover";
import { useQueries } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { getStatus } from "./api";
import { statusOrder } from "./order";
import services from "./services.json";

const componentLabels: Record<string, string> = {
  operational: "正常运行",
  degraded_performance: "性能下降",
  partial_outage: "部分故障",
  major_outage: "严重故障",
  under_maintenance: "维护中",
};
const labels: Record<string, string> = {
  none: "正常运行",
  minor: "轻微故障",
  major: "严重故障",
  critical: "重大故障",
  maintenance: "维护中",
};
export default function StatusPage() {
  const [params, setParams] = useSearchParams();
  const [detailId, setDetailId] = useState<string | null>(() => {
    const id = params.get("service");
    return services.some((service) => service.id === id) ? id : null;
  });
  const filter = params.get("group") ?? "全部";
  const queries = useQueries({
    queries: services.map((s) => ({
      queryKey: ["service-status", s.id],
      enabled: Boolean(s.url),
      queryFn: ({ signal }: { signal: AbortSignal }) => getStatus(s.id, signal),
      retry: false,
      staleTime: 60_000,
      refetchInterval: 120_000,
    })),
  });
  const pending = queries.some((q) => q.isFetching);
  const rows = services
    .map((service, i) => ({ ...service, query: queries[i] }))
    .filter((s) => filter === "全部" || s.group === filter);
  const sections = [
    [
      "故障 / 维护",
      rows.filter((s) => statusOrder(s.query.data?.status?.indicator) === 0),
    ],
    ["运行中", rows.filter((s) => s.query.data?.status?.indicator === "none")],
    [
      "待确认",
      rows.filter((s) => statusOrder(s.query.data?.status?.indicator) === 2),
    ],
  ] as const;
  const tableRows = sections.flatMap(([, items]) =>
    items.map((service) => ({
      id: service.id,
      name: service.name,
      group: service.group,
      page: service.page,
      icon: service.icon,
      data: service.query.data,
      loading: Boolean(service.url) && service.query.isPending,
      integrated: Boolean(service.url),
      officialStatus: service.officialStatus !== false,
      note: service.note,
      fetching: service.query.isFetching,
      error: service.query.error?.message,
    })),
  );
  const columns: ColumnDef<(typeof tableRows)[number]>[] = [
    {
      accessorKey: "name",
      header: "服务",
      cell: ({ row }) => (
        <button
          type="button"
          className="service-name text-left text-primary focus-visible:outline-ring"
          onClick={() => setDetailId(row.original.id)}
          aria-label={`查看 ${row.original.name} 详情`}
        >
          <SiteLogo src={row.original.icon} website={row.original.page} />
          <UnderlineHover className="truncate">
            {row.original.name}
          </UnderlineHover>
          {!!row.original.data?.incidents?.length && (
            <Badge variant="secondary" className="shrink-0">
              {row.original.data.incidents.length} 个事件
            </Badge>
          )}
        </button>
      ),
    },
    {
      accessorKey: "group",
      header: "分类",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.group}</Badge>
      ),
    },
    {
      id: "status",
      header: "状态",
      cell: ({ row }) => {
        const service = row.original;
        const indicator = service.data?.status?.indicator;
        return (
          <button
            type="button"
            onClick={() => setDetailId(service.id)}
            aria-label={`查看 ${service.name} 状态详情`}
            className={`service-table-state service-card service-${indicator ?? "unknown"}`}
          >
            <i
              className={`service-dot ${service.fetching ? "service-dot-loading" : ""}`}
            />
            <AnimatedValue value={`${service.loading}-${indicator}`}>
              {service.loading ? (
                <Pending>查询中...</Pending>
              ) : !service.integrated ? (
                "未接入"
              ) : (
                (labels[indicator ?? ""] ?? "未知")
              )}
            </AnimatedValue>
          </button>
        );
      },
    },
    {
      id: "updated",
      header: "更新时间",
      cell: ({ row }) => (
        <span className="small muted">
          {row.original.data?.fetchedAt
            ? new Date(row.original.data.fetchedAt).toLocaleTimeString("zh-CN")
            : "—"}
        </span>
      ),
    },
    {
      id: "action",
      header: "",
      cell: ({ row }) => (
        <UnderlineHover asChild>
          <a
            href={row.original.page}
            target="_blank"
            rel="noreferrer"
            className="small"
          >
            {row.original.officialStatus ? "官方状态 ↗" : "平台官网 ↗"}
          </a>
        </UnderlineHover>
      ),
    },
  ];
  const detail = tableRows.find((service) => service.id === detailId);
  return (
    <div className="service-status-page">
      <PageHeading
        title="服务状态"
        description="各服务官方运行状态与故障事件"
      />
      <div className="toolbar">
        <div className="filter-tabs">
          {["全部", "AI", "云服务", "开发", "社区"].map((group) => (
            <Button
              size="sm"
              variant={group === filter ? "secondary" : "ghost"}
              key={group}
              onClick={() => setParams(group === "全部" ? {} : { group })}
            >
              {group}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          aria-busy={pending}
          onClick={() => {
            void Promise.all(
              queries
                .filter((_, index) => services[index].url)
                .map((q) => q.refetch()),
            );
          }}
        >
          {pending ? <Pending>刷新中…</Pending> : "刷新状态"}
        </Button>
      </div>
      <div className="service-summary">
        {sections.map(([label, items], index) => (
          <ToolCard
            key={label}
            title={label}
            className={`service-summary-card summary-${index}`}
          >
            <div className="service-summary-number">
              <NumberTicker value={items.length} />
              <span>个服务</span>
            </div>
          </ToolCard>
        ))}
      </div>
      <div className="service-table">
        <Card>
          <CardContent>
            <DataTable
              data={tableRows}
              columns={columns}
              getRowId={(row) => row.id}
              animateChanges={false}
              empty="暂无服务"
            />
          </CardContent>
        </Card>
      </div>
      <p className="small muted">
        每 2 分钟自动检查。未知或查询失败不等于服务故障。
      </p>
      <ResponsiveDialog
        title={`${detail?.name ?? "服务"} · 服务详情`}
        description={
          detail?.loading
            ? "正在查询服务状态…"
            : (detail?.note ??
              detail?.error ??
              detail?.data?.status?.description ??
              "暂无说明")
        }
        open={detailId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      >
        {detail && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">
              {!detail.integrated
                ? "未接入"
                : (labels[detail.data?.status?.indicator ?? ""] ?? "未知")}
            </Badge>
            <span>{detail.group}</span>
            {detail.data?.fetchedAt && (
              <time>
                更新于 {new Date(detail.data.fetchedAt).toLocaleString("zh-CN")}
              </time>
            )}
          </div>
        )}
        {!!detail?.data?.components?.length && (
          <section className="space-y-2">
            <h3 className="text-sm font-medium">服务组件</h3>
            <dl className="divide-y divide-border text-sm">
              {detail.data.components.map((component) => (
                <div
                  key={component.id}
                  className="flex items-center justify-between gap-4 py-2"
                >
                  <dt className="min-w-0 break-words">{component.name}</dt>
                  <dd className="shrink-0 text-muted-foreground">
                    {componentLabels[component.status] ?? component.status}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        <h3 className="text-sm font-medium">当前事件</h3>
        {!detail?.loading &&
          !detail?.error &&
          detail?.data &&
          !detail.data.incidents?.length && (
            <p className="text-sm text-muted-foreground">
              数据源未报告当前事件。
            </p>
          )}
        {detail?.data?.incidents?.map((incident) => (
          <section
            key={incident.id}
            className="space-y-2 rounded-lg bg-muted/50 p-3"
          >
            <h3 className="font-medium">{incident.name}</h3>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{incident.status}</Badge>
              <time>
                {new Date(incident.updated_at).toLocaleString("zh-CN")}
              </time>
            </div>
          </section>
        ))}
        {detail && (
          <a
            className="text-sm underline underline-offset-4"
            href={detail.page}
            target="_blank"
            rel="noreferrer"
          >
            {detail.officialStatus ? "查看官方状态页 ↗" : "前往平台官网 ↗"}
          </a>
        )}
      </ResponsiveDialog>
    </div>
  );
}
