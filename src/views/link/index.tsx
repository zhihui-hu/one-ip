import { useEffect, useState, useRef, useCallback } from "react";
import { CountryFlag } from "@/components/country-flag";
import { DataTable } from "@/components/data-table";
import { LatencyBadge } from "@/components/latency-badge";
import { NumberTicker } from "@/components/number-ticker";
import {
  latencyTone,
  pingDotClass,
  pingToneBgClass,
} from "@/components/ping-dot";
import {
  SiteLogo,
  siteCellClass,
  siteCellIconClass,
  siteIconClass,
} from "@/components/site-logo";
import { ActionButton } from "@/components/toolkit";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/i18n";
import { localizeCatalogItem } from "@/lib/localize-catalog";
import { cn } from "@/lib/utils";
import { SplitResults } from "@/views/home/split-results";
import { skipToken, useQueries, useQueryClient } from "@tanstack/react-query";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { useAtom } from "jotai";
import { testConnectivity, type ProbeResult } from "./api";
import { connectivityRoundAtom } from "./store";
import rawtargets from "./targets.json";

const targets = rawtargets.map(localizeCatalogItem);

const groups = [
  ["ai", t("link.aiUnlock")],
  ["streaming", t("link.streamingUnlock")],
  ["cn", t("common.china")],
  ["jp", t("common.japan")],
  ["us", t("common.unitedStates")],
  ["gl", t("link.global")],
  ["crypto", t("categories.crypto")],
  ["ecommerce", t("categories.ecommerce")],
];
type ConnectivityRow = (typeof targets)[number] & {
  result?: ProbeResult;
  running: boolean;
  started: boolean;
  observe: (name: string, visible: boolean) => void;
};
function ObservedSite({ row }: { row: ConnectivityRow }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { name, observe } = row;
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(([entry]) =>
      observe(name, entry.isIntersecting),
    );
    observer.observe(ref.current.closest("tr") ?? ref.current);
    return () => {
      observer.disconnect();
      observe(name, false);
    };
  }, [name, observe]);
  return (
    <span ref={ref} className={cn(siteCellClass, "overflow-hidden")}>
      {row.started ? (
        <SiteLogo src={row.icon} className={siteCellIconClass} />
      ) : (
        <span className={cn(siteIconClass, siteCellIconClass)} />
      )}
      {name}
    </span>
  );
}

const legendDotClass = "size-[7px] rounded-full";

// Column widths and cell padding for the shared DataTable markup.
const connectivityTableClass = [
  "[&_table]:w-full [&_table]:min-w-0 [&_table]:table-fixed",
  "[&_th:first-child]:w-[42%] [&_th:nth-child(2)]:w-[32%] [&_th:nth-child(3)]:w-[26%]",
  "[&_td]:px-[10px] [&_td]:py-2 [&_th]:px-[10px] [&_th]:py-2",
  "max-md:[&_td]:px-[5px] max-md:[&_td]:text-[0.75rem] max-md:[&_th]:px-[5px] max-md:[&_th]:text-[0.75rem]",
].join(" ");

const columns: ColumnDef<ConnectivityRow>[] = [
  {
    accessorKey: "name",
    header: t("common.website"),
    cell: ({ row }) => <ObservedSite row={row.original} />,
  },
  {
    id: "samples",
    header: t("common.testHistory"),
    cell: ({ row }) => (
      <div
        className="flex gap-[3px] max-md:gap-0.5"
        aria-label={t("link.8Tests", [
          row.original.result?.samples.length ?? 0,
        ])}
      >
        {Array.from({ length: 8 }, (_, index) => {
          const sample = row.original.result?.samples[index];
          return (
            <span
              key={index}
              title={
                sample == null
                  ? t("link.waitingToTest")
                  : sample < 0
                    ? t("link.connectionFailed")
                    : `${sample}ms`
              }
              className={pingDotClass(
                sample == null ? undefined : latencyTone(sample),
              )}
            />
          );
        })}
      </div>
    ),
  },
  {
    id: "latency",
    header: t("common.latency"),
    cell: ({ row }) =>
      !row.original.started ? (
        "—"
      ) : (
        <LatencyBadge
          result={row.original.result}
          running={row.original.running}
          className="min-w-16 tabular-nums max-md:min-w-0"
        />
      ),
  },
];

function ConnectivityGroup({
  cc,
  label,
  showLegend = false,
}: {
  cc: string;
  label: string;
  showLegend?: boolean;
}) {
  const [rounds, setRounds] = useAtom(connectivityRoundAtom);
  const round = rounds[cc] ?? 0;
  const groupTargets = targets.filter((target) => target.cc === cc);
  const client = useQueryClient();
  const visible = useRef(new Set<string>());
  const [started, setStarted] = useState<Set<string>>(() => new Set());
  const observe = useCallback(
    (name: string, inView: boolean) => {
      if (inView) {
        visible.current.add(name);
        setStarted((previous) =>
          previous.has(name) ? previous : new Set(previous).add(name),
        );
      } else visible.current.delete(name);
    },
    [setStarted],
  );
  const progress = useQueries({
    queries: groupTargets.map((target) => ({
      queryKey: ["link-row-progress", target.name, round],
      enabled: false,
      queryFn: skipToken,
    })),
  });
  const queries = useQueries({
    queries: groupTargets.map((target) => ({
      queryKey: ["link-row", target.name, round],
      enabled: started.has(target.name),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        testConnectivity(target.url, signal, (result) =>
          client.setQueryData(
            ["link-row-progress", target.name, round],
            result,
          ),
        ),
      staleTime: Infinity,
      retry: false,
      refetchOnWindowFocus: false,
    })),
  });
  const busy = queries.some((query) => query.isFetching);
  const tableRows = groupTargets.map((target, index) => ({
    ...target,
    observe,
    started: started.has(target.name),
    result: queries[index].isFetching
      ? (progress[index].data as ProbeResult | undefined)
      : queries[index].data,
    running: queries[index].isFetching,
  }));
  // Keep untouched rows in place so sorting cannot trigger extra offscreen tests.
  if (queries.every((query) => query.isSuccess || query.isError) && !busy)
    tableRows.sort(
      (a, b) => (a.result?.median ?? Infinity) - (b.result?.median ?? Infinity),
    );
  return (
    <section className="mb-3 rounded-xl bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="m-0 flex shrink-0 items-center gap-2 text-[1rem] font-semibold [&>span]:ml-auto [&>span]:text-[0.78rem] [&>span]:font-normal [&>span]:text-subtle">
          {["cn", "jp", "us", "gl"].includes(cc) && (
            <CountryFlag
              code={cc.length === 2 && cc !== "gl" ? cc : undefined}
            />
          )}
          {label}
        </h2>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
          <span className="text-[0.78rem] text-muted-foreground">
            {t("link.readableResponse")}{" "}
            <NumberTicker
              value={
                tableRows.filter(
                  (row) => row.started && row.result?.median != null,
                ).length
              }
            />
            /{groupTargets.length}
          </span>
          <ActionButton
            size="sm"
            variant="secondary"
            busy={busy}
            onClick={() => {
              setStarted(new Set(visible.current));
              setRounds((previous) => ({
                ...previous,
                [cc]: (previous[cc] ?? 0) + 1,
              }));
            }}
            aria-label={
              busy ? t("link.testing", [label]) : t("link.testAgain", [label])
            }
          >
            {busy ? t("common.testing") : t("common.testAgain")}
          </ActionButton>
        </div>
      </div>
      <Card>
        <CardContent>
          <DataTable
            className={connectivityTableClass}
            columns={columns}
            data={tableRows}
            getRowId={(row) => row.name}
            animateChanges={false}
            animateSorting
          />
          {showLegend && (
            <div className="mt-3 flex items-center gap-[7px] border-t pt-3 text-[0.78rem] leading-[calc(1/0.75)] text-subtle">
              <i className={`${legendDotClass} ${pingToneBgClass.good}`} />
              {t("link.excellent")}
              <i className={`${legendDotClass} ${pingToneBgClass.warn}`} />
              {t("link.good")}
              <i className={`${legendDotClass} ${pingToneBgClass.slow}`} />
              {t("link.slow")}
              <i className={`${legendDotClass} ${pingToneBgClass.fail}`} />
              {t("link.connectionFailed")}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export default function LinkPage() {
  useEffect(() => {
    document.title = t("link.connectivityEgressIpTools");
  }, []);
  return (
    <>
      <h1 className="sr-only">{t("link.connectivityAndRoutedEgress")}</h1>
      <SplitResults />
      <div className="mt-5 -mb-2">
        <h2 className="mb-2 text-[1.4rem] font-bold">
          {t("link.websiteConnectivity")}
        </h2>
      </div>
      {groups.map(([cc, label], index) => (
        <ConnectivityGroup
          key={cc}
          cc={cc}
          label={label}
          showLegend={index === groups.length - 1}
        />
      ))}
      <p className="mt-6 rounded-[8px] border border-border bg-muted px-5 py-4 text-[0.84rem] leading-[1.8] text-muted-foreground">
        {t("link.browserHttpRequestTimingMedianSuccessfulRequestsAcross")}
      </p>
    </>
  );
}
