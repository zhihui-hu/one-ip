import {
  PageHeading,
  ToolCard,
  Facts,
  ErrorNotice,
  Pending,
} from "@/components/toolkit";
import { UnderlineHover } from "@/components/underline-hover";
import { getStatus } from "@/views/status/api";
import services from "@/views/status/services.json";
import { useQuery } from "@tanstack/react-query";

export function ServiceStatusPage({
  name,
}: {
  name: "Claude (Anthropic)" | "OpenAI";
}) {
  const service = services.find((s) => s.name === name)!;
  const query = useQuery({
    queryKey: ["service-status", service.id],
    queryFn: ({ signal }) => getStatus(service.id, signal),
    retry: false,
    refetchInterval: 120_000,
  });
  return (
    <>
      <PageHeading
        title={`${name} 实时服务状态监控`}
        description="来自官方状态接口的当前运行状态、组件状态与事件"
      />
      <ErrorNotice error={query.error} />
      {query.isPending ? (
        <Pending>正在读取官方状态…</Pending>
      ) : query.data ? (
        <>
          <ToolCard title="当前状态">
            <Facts
              rows={[
                ["状态", query.data.status?.description ?? "未知"],
                [
                  "更新于",
                  new Date(query.data.fetchedAt).toLocaleString("zh-CN"),
                ],
              ]}
            />
          </ToolCard>
          <section className="reading">
            <h2>服务组件</h2>
            <Facts
              rows={(query.data.components ?? []).map((c) => [
                c.name,
                c.status,
              ])}
            />
          </section>
          <section className="reading">
            <h2>当前事件</h2>
            {query.data.incidents?.length ? (
              query.data.incidents.map((i) => (
                <ToolCard title={i.name} key={i.id}>
                  <p>
                    {i.status} ·{" "}
                    {new Date(i.updated_at).toLocaleString("zh-CN")}
                  </p>
                </ToolCard>
              ))
            ) : (
              <p className="muted">官方接口当前没有未解决事件。</p>
            )}
          </section>
        </>
      ) : null}
      <p className="principle">
        历史可用率需要持续采样和存储，本页不使用抓取快照模拟历史监控。
        <UnderlineHover asChild>
          <a href={service.page} target="_blank" rel="noreferrer">
            查看完整官方状态页 ↗
          </a>
        </UnderlineHover>
      </p>
    </>
  );
}
