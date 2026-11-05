import { useSearchParams } from "react-router-dom";
import { DataTable } from "@/components/data-table";
import { NumberTicker } from "@/components/number-ticker";
import { PageHeading, Pending, ToolCard } from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { t, locale } from "@/i18n";
import { cn } from "@/lib/utils";
import { useQueries } from "@tanstack/react-query";
import { getStatus } from "./api";
import { MobileStatusList } from "./components/mobile-status-list";
import { ServiceDetailDialog } from "./components/service-detail-dialog";
import { statusColumns } from "./components/status-columns";
import { serviceGroups } from "./groups";
import { statusOrder } from "./order";
import { services, toTableRow } from "./rows";

/** Number color per summary section: issues, healthy, unknown. */
const summaryNumberClass = ["text-danger", "text-ok", ""] as const;

export default function StatusPage() {
  const mobile = useIsMobile();
  const [params, setParams] = useSearchParams();
  const requestedService = params.get("service");
  const detailId = services.some((service) => service.id === requestedService)
    ? requestedService
    : null;
  const setDetailId = (id: string | null) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (id) next.set("service", id);
        else next.delete("service");
        return next;
      },
      { replace: id === null },
    );
  };
  const requestedGroup = params.get("group");
  const filter = serviceGroups.some((group) => group.value === requestedGroup)
    ? requestedGroup
    : "全部";
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
  const allRows = services.map((service, i) => ({
    ...service,
    query: queries[i],
  }));
  const rows = allRows.filter((s) => filter === "全部" || s.group === filter);
  const sections = [
    [
      t("status.incidentsMaintenance"),
      rows
        .filter(
          (s) =>
            !s.query.isError &&
            statusOrder(s.query.data?.status?.indicator) === 0,
        )
        .sort((a, b) => {
          const severity = ["critical", "major", "minor", "maintenance"];
          return (
            severity.indexOf(a.query.data!.status.indicator) -
            severity.indexOf(b.query.data!.status.indicator)
          );
        }),
    ],
    [
      t("status.operational"),
      rows.filter(
        (s) => !s.query.isError && s.query.data?.status?.indicator === "none",
      ),
    ],
    [
      t("common.pendingConfirmation"),
      rows.filter(
        (s) =>
          s.query.isError || statusOrder(s.query.data?.status?.indicator) === 2,
      ),
    ],
  ] as const;
  const tableRows = sections.flatMap(([, items]) => items.map(toTableRow));
  const columns = statusColumns(setDetailId);
  const detailService = allRows.find((service) => service.id === detailId);
  const detail = detailService ? toTableRow(detailService) : undefined;
  return (
    <div>
      <PageHeading title={t("navigation.serviceStatus")} />
      <div className="my-5 flex flex-wrap items-center justify-between gap-3 max-md:mb-2.5 max-md:flex-nowrap max-md:gap-1.5 max-md:[&>button]:shrink-0">
        <div className="flex flex-wrap gap-1 max-md:min-w-0 max-md:flex-1 max-md:flex-nowrap max-md:overflow-x-auto max-md:[scrollbar-width:none]">
          {serviceGroups.map(({ value: group, label }) => (
            <Button
              size="sm"
              variant={group === filter ? "secondary" : "ghost"}
              className="max-md:shrink-0 max-md:px-2"
              key={group}
              aria-pressed={group === filter}
              onClick={() =>
                setParams((current) => {
                  const next = new URLSearchParams(current);
                  if (group === "全部") next.delete("group");
                  else next.set("group", group);
                  return next;
                })
              }
            >
              {label}
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
          {pending ? (
            <Pending>{t("status.refreshing")}</Pending>
          ) : (
            t("status.refreshStatus")
          )}
        </Button>
      </div>
      <div className="mb-5 grid grid-cols-3 gap-3 max-md:mb-2.5 max-md:gap-1.5">
        {sections.map(([label, items], index) => (
          <ToolCard
            key={label}
            title={
              <span className="block truncate" title={label}>
                {locale === "en"
                  ? ["Issues", "Healthy", "Unknown"][index]
                  : label}
              </span>
            }
            className="max-md:gap-1 max-md:**:data-[slot=card-title]:text-[11px]"
          >
            <div
              className={cn(
                "flex items-baseline gap-2 text-[1.6rem] font-bold max-md:text-[24px] max-md:leading-[1.2]",
                summaryNumberClass[index],
              )}
            >
              <NumberTicker value={items.length} />
              <span className="text-[0.75rem] font-normal text-muted-foreground max-md:hidden">
                {t("status.services")}
              </span>
            </div>
          </ToolCard>
        ))}
      </div>
      {mobile ? (
        <MobileStatusList sections={sections} setDetailId={setDetailId} />
      ) : (
        <div className="mb-3 overflow-hidden rounded-[12px] bg-card [&_table]:min-w-[720px] [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
          <Card>
            <CardContent>
              <DataTable
                data={tableRows}
                columns={columns}
                getRowId={(row) => row.id}
                animateChanges={false}
                empty={t("status.noServices")}
              />
            </CardContent>
          </Card>
        </div>
      )}
      <p className="text-[0.78rem] text-muted-foreground">
        {t("status.checksAutomaticallyEvery2MinutesUnknownFailedQueries")}
      </p>
      <ServiceDetailDialog
        detail={detail}
        open={detailId !== null}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}
