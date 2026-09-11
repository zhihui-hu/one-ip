import {
  PageHeading,
  ToolCard,
  Facts,
  ErrorNotice,
  Pending,
} from "@/components/toolkit";
import { UnderlineHover } from "@/components/underline-hover";
import { t, locale } from "@/i18n";
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
        title={t("{0} 实时服务状态监控", [name])}
        description={t("来自官方状态接口的当前运行状态、组件状态与事件")}
      />
      <ErrorNotice error={query.error} />
      {query.isPending ? (
        <Pending>{t("正在读取官方状态…")}</Pending>
      ) : query.data ? (
        <>
          <ToolCard title={t("当前状态")}>
            <Facts
              rows={[
                [t("状态"), t(query.data.status?.description ?? "未知")],
                [
                  t("更新于"),
                  new Date(query.data.fetchedAt).toLocaleString(locale),
                ],
              ]}
            />
          </ToolCard>
          <section className="reading">
            <h2>{t("服务组件")}</h2>
            <Facts
              rows={(query.data.components ?? []).map((c) => [
                c.name,
                c.status,
              ])}
            />
          </section>
          <section className="reading">
            <h2>{t("当前事件")}</h2>
            {query.data.incidents?.length ? (
              query.data.incidents.map((i) => (
                <ToolCard title={i.name} key={i.id}>
                  <p>
                    {i.status}
                    {i.updated_at &&
                      ` · ${new Date(i.updated_at).toLocaleString(locale)}`}
                  </p>
                </ToolCard>
              ))
            ) : (
              <p className="muted">{t("官方接口当前没有未解决事件。")}</p>
            )}
          </section>
        </>
      ) : null}
      <p className="principle">
        {t("历史可用率需要持续采样和存储，本页不使用抓取快照模拟历史监控。")}
        <UnderlineHover asChild>
          <a href={service.page} target="_blank" rel="noreferrer">
            {t("查看完整官方状态页 ↗")}
          </a>
        </UnderlineHover>
      </p>
    </>
  );
}
