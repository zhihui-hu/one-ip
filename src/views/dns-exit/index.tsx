import { useState } from "react";
import { CountryFlag } from "@/components/country-flag";
import { DataTable } from "@/components/data-table";
import { NumberTicker } from "@/components/number-ticker";
import { OverflowDetailText } from "@/components/overflow-detail-text";
import {
  PageHeading,
  IpText,
  ActionButton,
  ErrorNotice,
  Pending,
} from "@/components/toolkit";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/i18n";
import { countryName } from "@/lib/country";
import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { detectDnsExits, dnsSampleCount, type DnsProgress } from "./api";

type Resolver = DnsProgress["results"][number];
const columns: ColumnDef<Resolver>[] = [
  {
    id: "ip",
    header: t("dns.dnsEgressIp"),
    cell: ({ row }) => <IpText ip={row.original.ip} />,
  },
  {
    accessorKey: "geo",
    header: t("dns.locationIsp"),
    cell: ({ row }) => (
      <span className="flex min-w-0 items-center gap-2">
        <CountryFlag code={row.original.country} />
        <OverflowDetailText
          text={row.original.geo}
          title={t("dns.dnsLocationDetails")}
        />
      </span>
    ),
  },
  {
    id: "sources",
    header: t("dns.detectionSource"),
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1.5">
        {row.original.sources.map((source) => (
          <span
            key={source}
            className="whitespace-nowrap rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
          >
            {source}
          </span>
        ))}
      </div>
    ),
  },
  {
    id: "samples",
    header: t("dns.observations"),
    cell: ({ row }) => <NumberTicker value={row.original.samples} />,
  },
];
// Column widths and alignment for the shared DataTable markup.
const dnsExitTableClass = [
  "[&_table]:w-full [&_table]:min-w-[680px] [&_table]:table-fixed",
  "[&_th:first-child]:w-[28%] [&_th:nth-child(2)]:w-[36%] [&_th:nth-child(3)]:w-[24%] [&_th:last-child]:w-[12%]",
  "[&_th]:whitespace-nowrap [&_th:last-child]:text-right [&_td:last-child]:text-right [&_td:last-child]:whitespace-nowrap",
  "max-md:[&_td]:px-[5px] max-md:[&_td]:py-2 max-md:[&_td]:text-[0.75rem] max-md:[&_th]:px-[5px] max-md:[&_th]:py-2 max-md:[&_th]:text-[0.75rem]",
].join(" ");

function DnsCountrySummary({ results }: { results: Resolver[] }) {
  const groups = new Map<string, Resolver[]>();
  for (const resolver of results) {
    const key = resolver.country ?? "";
    groups.set(key, [...(groups.get(key) ?? []), resolver]);
  }
  if (!groups.size) return null;
  return (
    <section className="mb-3" aria-label={t("dns.resolvedIn")}>
      <h2 className="m-0 mb-2 text-[13px] font-medium text-muted-foreground">
        {t("dns.resolvedIn")}
      </h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2">
        {[...groups]
          .sort(([, a], [, b]) => b.length - a.length)
          .map(([country, items]) => (
            <div
              className="flex min-w-0 items-center gap-3.5 rounded-[14px] border border-border bg-card px-4 py-3.5"
              key={country || "unknown"}
            >
              <CountryFlag code={country} size="xl" />
              <div className="grid min-w-0 flex-1 gap-0.5">
                <strong className="overflow-hidden text-[17px] font-semibold text-ellipsis whitespace-nowrap">
                  {countryName(country) ?? t("common.unknownRegion")}
                </strong>
                <span className="overflow-hidden text-[12px] text-ellipsis whitespace-nowrap text-muted-foreground">
                  {[...new Set(items.flatMap((item) => item.isp ?? []))]
                    .slice(0, 3)
                    .join(" · ") || "—"}
                </span>
              </div>
              <span className="flex-none rounded-[999px] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-2 py-[3px] text-[12px] font-medium text-primary">
                {t("dns.resolverCount", [items.length])}
              </span>
            </div>
          ))}
      </div>
    </section>
  );
}

export default function DnsExitPage() {
  const [round, setRound] = useState(0);
  const client = useQueryClient();
  const progressKey = ["dns-exit-progress", round];
  const progress = useQuery<DnsProgress>({
    queryKey: progressKey,
    enabled: false,
    queryFn: skipToken,
  });
  const query = useQuery({
    queryKey: ["dns-exit", round],
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) =>
      detectDnsExits(signal, (state) => {
        client.setQueryData(progressKey, state);
      }),
  });
  const state = query.isFetching
    ? progress.data
    : (query.data ?? progress.data);
  return (
    <>
      <PageHeading title={t("dns.dnsEgressLookup")} />
      <div className="my-5 flex flex-wrap items-center justify-between gap-3">
        <ActionButton
          busy={query.isFetching}
          onClick={() => setRound((n) => n + 1)}
        >
          {query.isFetching ? t("common.checkingDots") : t("common.runAgain")}
        </ActionButton>
        <span className="text-[0.78rem] text-muted-foreground">
          <NumberTicker value={state?.count ?? 0} />/{dnsSampleCount}{" "}
          {t("dns.samples")} {state?.failed ?? 0} {t("dns.failures")}
        </span>
      </div>
      <ErrorNotice error={query.error} />
      {state && state.failed > 0 && (
        <p className="mb-3 text-[0.78rem] text-muted-foreground">
          {t("dns.someProbesFailedDoesMeanThereDnsLeaks")}{" "}
          {Object.entries(state.failures)
            .map(([source, count]) => `${source}: ${count}`)
            .join(" · ")}
        </p>
      )}
      <DnsCountrySummary results={state?.results ?? []} />
      <Card>
        <CardContent>
          <DataTable
            className={dnsExitTableClass}
            data={state?.results ?? []}
            columns={columns}
            getRowId={(row) => row.ip}
            animateChanges={false}
            animateEntries
            empty={
              query.isFetching ? (
                <Pending>{t("dns.waitingForResolutionResults")}</Pending>
              ) : (
                t("dns.noDnsEgressDetected")
              )
            }
          />
        </CardContent>
      </Card>
      <p className="mt-3 text-[0.78rem] text-muted-foreground">
        {t("dns.identicalEgressAddressesMergedTheirCountDependsActual")}
      </p>
    </>
  );
}
