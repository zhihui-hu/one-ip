import { CompactText } from "@/components/compact-text";
import { CountryFlag } from "@/components/country-flag";
import { DataTable } from "@/components/data-table";
import { NumberTicker } from "@/components/number-ticker";
import { siteCellClass } from "@/components/site-logo";
import { Pending } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/i18n";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import type { PingResponse } from "../api";

const formatLatency = (value: number) => value.toFixed(1);

interface Row {
  id: string;
  status: string;
  name: string;
  country: string;
  min?: number;
  avg?: number;
  max?: number;
  loss?: number;
}
const columns: ColumnDef<Row>[] = [
  {
    accessorKey: "name",
    header: t("ping.node"),
    cell: ({ row }) => (
      <span className={siteCellClass}>
        <CountryFlag code={row.original.country} />
        <CompactText text={row.original.name} className="flex-1" />
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: t("common.status"),
    cell: ({ row }) =>
      row.original.status === t("common.testing") ? (
        <Pending>{t("common.testing")}</Pending>
      ) : (
        <Badge
          variant={
            row.original.status === t("ping.failed") ||
            row.original.avg == null ||
            row.original.avg < 0
              ? "destructive"
              : "secondary"
          }
        >
          {row.original.status}
        </Badge>
      ),
  },
  ...(["min", "avg", "max"] as const).map((key, i) => ({
    accessorKey: key,
    header: [t("ping.minimum"), t("ping.average"), t("ping.maximum")][i],
    cell: ({ row }: { row: { original: Row } }) =>
      row.original[key] == null ? (
        "—"
      ) : (
        <>
          <NumberTicker
            value={row.original[key]!}
            formatValue={formatLatency}
          />{" "}
          ms
        </>
      ),
  })),
  {
    accessorKey: "loss",
    header: t("common.packetLoss"),
    cell: ({ row }) =>
      row.original.loss == null ? (
        "—"
      ) : (
        <>
          <NumberTicker value={row.original.loss} />%
        </>
      ),
  },
];

// Column widths, cell padding and latency-tinted rows for the shared DataTable markup.
const pingTableClass = [
  // Flat (no card radius) inside the ping lookup page.
  "rounded-none bg-transparent",
  "[&_table]:min-w-[620px] [&_table]:table-fixed [&_th:first-child]:w-[32%]",
  "[&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2",
  "[&_td:not(:first-child)]:whitespace-nowrap [&_td:not(:first-child)]:tabular-nums",
  "max-md:[&_table]:min-w-[520px] max-md:[&_th:first-child]:w-[160px] max-md:[&_td]:px-1.5 max-md:[&_th]:px-1.5",
  "[&_tbody_tr[data-row-id]]:bg-[color-mix(in_srgb,var(--ping-row-color)_9%,transparent)]",
  "[&_tbody_tr[data-row-id]]:transition-[background-color] [&_tbody_tr[data-row-id]]:duration-200 [&_tbody_tr[data-row-id]]:ease-[ease]",
  "[&_tbody_tr[data-row-id]:hover]:bg-[color-mix(in_srgb,var(--ping-row-color)_16%,transparent)]",
  "motion-reduce:[&_tbody_tr[data-row-id]]:transition-none motion-reduce:[&_tbody_tr[data-row-id]]:duration-0",
].join(" ");

const pingRowClass = {
  fast: "[--ping-row-color:var(--success)]",
  good: "[--ping-row-color:var(--good)]",
  slow: "[--ping-row-color:var(--warning)]",
  danger: "[--ping-row-color:var(--danger)]",
} as const;

export function PingResults({
  data,
  pending,
}: {
  data?: PingResponse;
  pending: boolean;
}) {
  const rows: Row[] = (data?.results ?? []).map((item, index) => ({
    id: String(index),
    name: `${item.probe.city} · ${item.probe.network}`,
    country: item.probe.country,
    status:
      item.result.status === "finished"
        ? item.result.stats?.avg == null || item.result.stats.avg < 0
          ? t("common.noResponse")
          : t("common.completeLabel")
        : item.result.status === "failed"
          ? t("ping.failed")
          : pending
            ? t("common.testing")
            : t("common.incomplete"),
    ...item.result.stats,
  }));
  rows.sort((a, b) => {
    const left =
      a.avg != null && Number.isFinite(a.avg) && a.avg >= 0 ? a.avg : -1;
    const right =
      b.avg != null && Number.isFinite(b.avg) && b.avg >= 0 ? b.avg : -1;
    return right - left;
  });
  return (
    <Card>
      <CardContent>
        <DataTable
          className={pingTableClass}
          getRowClassName={(row) =>
            row.avg == null ||
            !Number.isFinite(row.avg) ||
            row.avg < 0 ||
            row.status === t("ping.failed")
              ? pingRowClass.danger
              : row.avg < 100
                ? pingRowClass.fast
                : row.avg < 400
                  ? pingRowClass.good
                  : pingRowClass.slow
          }
          data={rows}
          columns={columns}
          getRowId={(row) => row.id}
          animateChanges={false}
          animateSorting
          animateEntries
          empty={
            pending ? (
              <Pending>{t("ping.waitingForRemoteProbes")}</Pending>
            ) : (
              t("common.noResults")
            )
          }
        />
      </CardContent>
    </Card>
  );
}
