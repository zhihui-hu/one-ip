import { CompactText } from "@/components/compact-text";
import { CountryFlag } from "@/components/country-flag";
import { DataTable } from "@/components/data-table";
import { NumberTicker } from "@/components/number-ticker";
import { Pending } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/i18n";
import type { ColumnDef } from "@tanstack/react-table";
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
    header: t("节点"),
    cell: ({ row }) => (
      <span className="site-cell">
        <CountryFlag code={row.original.country} />
        <CompactText text={row.original.name} />
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: t("状态"),
    cell: ({ row }) =>
      row.original.status === t("测试中...") ? (
        <Pending>{t("测试中...")}</Pending>
      ) : (
        <Badge
          variant={
            row.original.status === t("失败") ||
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
    header: [t("最小"), t("平均"), t("最大")][i],
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
    header: t("丢包"),
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
          ? t("无响应")
          : t("完成")
        : item.result.status === "failed"
          ? t("失败")
          : pending
            ? t("测试中...")
            : t("未完成"),
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
          className="ping-table"
          getRowClassName={(row) =>
            row.avg == null ||
            !Number.isFinite(row.avg) ||
            row.avg < 0 ||
            row.status === t("失败")
              ? "ping-row-danger"
              : row.avg < 100
                ? "ping-row-fast"
                : row.avg < 400
                  ? "ping-row-good"
                  : "ping-row-slow"
          }
          data={rows}
          columns={columns}
          getRowId={(row) => row.id}
          animateChanges={false}
          animateSorting
          animateEntries
          empty={
            pending ? <Pending>{t("等待远端探针...")}</Pending> : t("暂无结果")
          }
        />
      </CardContent>
    </Card>
  );
}
