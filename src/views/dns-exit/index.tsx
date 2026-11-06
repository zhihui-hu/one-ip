import { useState } from "react";
import { CountryFlag } from "@/components/country-flag";
import { DataTable } from "@/components/data-table";
import { LeakConclusion } from "@/components/leak-conclusion";
import { LookupFaq } from "@/components/lookup-faq";
import { NumberTicker } from "@/components/number-ticker";
import { OverflowDetailText } from "@/components/overflow-detail-text";
import {
  PageHeading,
  IpText,
  ActionButton,
  ErrorNotice,
  Pending,
  Facts,
} from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/i18n";
import { countryName } from "@/lib/country";
import { detectHttpEgress, egressAddresses } from "@/lib/http-egress";
import type { Geo } from "@/lib/types";
import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import {
  assessDnsLeak,
  detectDnsExits,
  dnsSampleCount,
  publicDnsProvider,
  type DnsAssessment,
  type DnsProgress,
  type DnsRelation,
} from "./api";

type Resolver = DnsProgress["results"][number];
type ResolverRow = Resolver & { relation: DnsRelation };

const relationBadgeVariant = {
  match: "success",
  mismatch: "danger",
  unknown: "secondary",
} as const satisfies Record<DnsRelation, string>;

const countryList = (codes: (string | undefined)[]) =>
  [...new Set(codes.filter(Boolean))]
    .map((code) => countryName(code) ?? code)
    .join("、");

const columns: ColumnDef<ResolverRow>[] = [
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
        {publicDnsProvider(row.original.isp) && (
          <Badge variant="info" title={t("dns.publicDns")}>
            {publicDnsProvider(row.original.isp)}
          </Badge>
        )}
      </span>
    ),
  },
  {
    id: "relation",
    header: t("dns.comparison"),
    cell: ({ row }) => (
      <Badge variant={relationBadgeVariant[row.original.relation]}>
        {t(`dns.relation.${row.original.relation}`)}
      </Badge>
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
  "[&_table]:w-full [&_table]:min-w-[780px] [&_table]:table-fixed",
  "[&_th:first-child]:w-[24%] [&_th:nth-child(2)]:w-[32%] [&_th:nth-child(3)]:w-[14%] [&_th:nth-child(4)]:w-[20%] [&_th:last-child]:w-[10%]",
  "[&_th]:whitespace-nowrap [&_th:last-child]:text-right [&_td:last-child]:text-right [&_td:last-child]:whitespace-nowrap",
  "max-md:[&_td]:px-[5px] max-md:[&_td]:py-2 max-md:[&_td]:text-[0.75rem] max-md:[&_th]:px-[5px] max-md:[&_th]:py-2 max-md:[&_th]:text-[0.75rem]",
].join(" ");

function DnsCountrySummary({
  results,
  egressCountries,
}: {
  results: Resolver[];
  egressCountries: string[];
}) {
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
              <div className="grid flex-none justify-items-end gap-1">
                <span className="rounded-[999px] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-2 py-[3px] text-[12px] font-medium text-primary">
                  {t("dns.resolverCount", [items.length])}
                </span>
                {egressCountries.length > 0 && country && (
                  <Badge
                    variant={
                      egressCountries.includes(country) ? "success" : "danger"
                    }
                  >
                    {t(
                      egressCountries.includes(country)
                        ? "dns.relation.match"
                        : "dns.relation.mismatch",
                    )}
                  </Badge>
                )}
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}

function EgressValue({ geo, pending }: { geo: Geo | null; pending: boolean }) {
  if (pending) return <Pending>{t("common.loading")}</Pending>;
  if (!geo) return <>{t("leak.unavailable")}</>;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <CountryFlag code={geo.country_code} />
      <IpText ip={geo.ip} />
    </span>
  );
}

function verdictText(
  assessment: DnsAssessment,
  results: Resolver[],
  egressCountries: string[],
) {
  if (!results.length) return t("dns.verdictNoResolvers");
  if (!egressCountries.length) return t("dns.verdictNoEgress");
  if (assessment.level === "leak")
    return t("dns.verdictLeak", [
      assessment.mismatched.length,
      countryList(assessment.mismatched.map((item) => item.country)),
    ]);
  if (assessment.level === "warning")
    return t("dns.verdictPartial", [assessment.unknown]);
  if (assessment.level === "unknown") return t("dns.verdictNoEgress");
  return t("dns.verdictSafe", [countryList(egressCountries)]);
}

function DnsVerdict({
  assessment,
  results,
  sampling,
  egress,
  egressPending,
}: {
  assessment: DnsAssessment;
  results: Resolver[];
  sampling: boolean;
  egress: { ipv4: Geo | null; ipv6: Geo | null } | undefined;
  egressPending: boolean;
}) {
  // Show a provisional verdict as soon as resolvers and the egress are known.
  const pending = egressPending || (sampling && !results.length);
  const level = pending ? "pending" : assessment.level;
  return (
    <Card className="mb-3">
      <CardContent className="space-y-3">
        <LeakConclusion
          level={level}
          title={t(`dns.conclusion.${level}`)}
          provisional={!pending && sampling}
          detail={
            pending
              ? t("dns.verdictPending")
              : verdictText(assessment, results, assessment.egressCountries)
          }
        />
        <Facts
          className="grid gap-x-6 md:grid-cols-2"
          rows={[
            [
              t("leak.httpEgressIpv4"),
              <EgressValue
                key="ipv4"
                geo={egress?.ipv4 ?? null}
                pending={egressPending}
              />,
            ],
            [
              t("leak.httpEgressIpv6"),
              <EgressValue
                key="ipv6"
                geo={egress?.ipv6 ?? null}
                pending={egressPending}
              />,
            ],
            [t("dns.resolverTotal"), results.length],
            [
              t("dns.resolverCountries"),
              new Set(results.flatMap((item) => item.country ?? [])).size,
            ],
          ]}
        />
      </CardContent>
    </Card>
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
  const egress = useQuery({
    queryKey: ["dns-exit-egress", round],
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) => detectHttpEgress(signal),
  });
  const state = query.isFetching
    ? progress.data
    : (query.data ?? progress.data);
  const results = state?.results ?? [];
  const assessment = assessDnsLeak(
    results,
    egressAddresses(egress.data).map((geo) => geo.country_code),
  );
  const rows = results.map((item) => ({
    ...item,
    relation: assessment.relations[item.ip] ?? "unknown",
  }));
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
      <DnsVerdict
        assessment={assessment}
        results={results}
        sampling={query.isFetching}
        egress={egress.data}
        egressPending={egress.isFetching}
      />
      <ErrorNotice error={query.error} />
      {state && state.failed > 0 && (
        <p className="mb-3 text-[0.78rem] text-muted-foreground">
          {t("dns.someProbesFailedDoesMeanThereDnsLeaks")}{" "}
          {Object.entries(state.failures)
            .map(([source, count]) => `${source}: ${count}`)
            .join(" · ")}
        </p>
      )}
      <DnsCountrySummary
        results={results}
        egressCountries={assessment.egressCountries}
      />
      <Card>
        <CardContent>
          <DataTable
            className={dnsExitTableClass}
            data={rows}
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
      <LookupFaq
        items={(["what", "how", "limits", "fix"] as const).map((key) => ({
          title: t(`dns.faq.${key}Title`),
          text: t(`dns.faq.${key}Text`),
        }))}
      />
    </>
  );
}
