import {
  PageHeading,
  ToolCard,
  Facts,
  ErrorNotice,
  Pending,
} from "@/components/toolkit";
import { UnderlineHover } from "@/components/underline-hover";
import { t, locale } from "@/i18n";
import { localizeApiMessage } from "@/i18n/api-message";
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
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
  return (
    <>
      <PageHeading title={t("status.liveServiceStatus", [name])} />
      <ErrorNotice error={query.error} />
      {query.isPending ? (
        <Pending>{t("status.loadingOfficialStatus")}</Pending>
      ) : query.data ? (
        <>
          <ToolCard title={t("status.currentStatus")}>
            <Facts
              rows={[
                [
                  t("common.status"),
                  query.data.status?.description
                    ? localizeApiMessage(query.data.status.description)
                    : t("common.unknown"),
                ],
                [
                  t("status.updated"),
                  new Date(query.data.fetchedAt).toLocaleString(locale),
                ],
              ]}
            />
          </ToolCard>
          <section className="mt-8 max-xs:mt-6">
            <h2 className="mb-2 text-[1.4rem] font-bold">
              {t("status.serviceComponents")}
            </h2>
            <Facts
              rows={(query.data.components ?? []).map((c) => [
                c.name,
                c.status,
              ])}
            />
          </section>
          <section className="mt-8 max-xs:mt-6">
            <h2 className="mb-2 text-[1.4rem] font-bold">
              {t("status.currentIncidents")}
            </h2>
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
              <p className="text-muted-foreground">
                {t("status.theOfficialApiReportsNoUnresolvedIncidents")}
              </p>
            )}
          </section>
        </>
      ) : null}
      <p className="mt-6 rounded-[8px] border border-border bg-muted px-5 py-4 text-[0.84rem] leading-[1.8] text-muted-foreground">
        {t("status.historicalUptimeRequiresContinuousSamplingStoragePageDoes")}
        <UnderlineHover asChild>
          <a href={service.page} target="_blank" rel="noreferrer">
            {t("status.viewFullOfficialStatusPage")}
          </a>
        </UnderlineHover>
      </p>
    </>
  );
}
