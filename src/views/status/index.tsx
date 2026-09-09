import { useSearchParams } from "react-router-dom";
import { PageHeading, Pending, ToolCard } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UnderlineHover } from "@/components/underline-hover";
import { useQueries } from "@tanstack/react-query";
import { getStatus } from "./api";
import services from "./services.json";

const labels: Record<string, string> = {
  none: "正常运行",
  minor: "轻微故障",
  major: "严重故障",
  critical: "重大故障",
  maintenance: "维护中",
};
export default function StatusPage() {
  const [params, setParams] = useSearchParams();
  const filter = params.get("group") ?? "全部";
  const queries = useQueries({
    queries: services.map((s) => ({
      queryKey: ["service-status", s.id],
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
      rows.filter(
        (s) =>
          s.query.data?.status?.indicator &&
          s.query.data.status.indicator !== "none",
      ),
    ],
    ["运行中", rows.filter((s) => s.query.data?.status?.indicator === "none")],
    ["待确认", rows.filter((s) => !s.query.data?.status?.indicator)],
  ] as const;
  return (
    <>
      <PageHeading
        title="全球主流互联网可用性一站式查询"
        description="聚合各服务官方状态页，查看当前故障、维护事件和实时运行情况"
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
            void Promise.all(queries.map((q) => q.refetch()));
          }}
        >
          {pending ? <Pending>刷新中…</Pending> : "刷新状态"}
        </Button>
      </div>
      {sections.map(([heading, group]) =>
        group.length ? (
          <section className="reading" key={heading}>
            <h2>
              {heading}
              <small> {group.length} 个服务</small>
            </h2>
            <div className="status-grid">
              {group.map((service) => (
                <ToolCard
                  key={service.id}
                  title={
                    <div className="row-between">
                      <span>{service.name}</span>
                      <Badge
                        variant={
                          service.query.data?.status?.indicator === "none"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {service.query.isPending ? (
                          <Pending>查询中</Pending>
                        ) : (
                          (labels[
                            service.query.data?.status?.indicator ?? ""
                          ] ?? "未知")
                        )}
                      </Badge>
                    </div>
                  }
                >
                  <p className="small muted">
                    {service.query.data?.status?.description ??
                      (service.query.error instanceof Error
                        ? service.query.error.message
                        : "等待官方状态数据")}
                  </p>
                  {service.query.data?.incidents?.map((incident) => (
                    <details key={incident.id} className="incident">
                      <summary>{incident.name}</summary>
                      <p>
                        {incident.status} ·{" "}
                        {new Date(incident.updated_at).toLocaleString("zh-CN")}
                      </p>
                    </details>
                  ))}
                  <div className="row-between small muted">
                    <span>
                      {service.query.data?.fetchedAt
                        ? new Date(
                            service.query.data.fetchedAt,
                          ).toLocaleTimeString("zh-CN")
                        : "尚无有效数据"}
                    </span>
                    <UnderlineHover asChild>
                      <a href={service.page} target="_blank" rel="noreferrer">
                        官方状态 ↗
                      </a>
                    </UnderlineHover>
                  </div>
                </ToolCard>
              ))}
            </div>
          </section>
        ) : null,
      )}
      <p className="principle">
        数据来自各服务公开状态接口，未知或请求失败不等于服务故障。此页面不使用参考站抓取时的故障数与历史数据作为实时结果。
      </p>
    </>
  );
}
