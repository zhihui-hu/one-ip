import { useState } from "react";
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
import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { detectDnsExits, dnsSampleCount, type DnsProgress } from "./api";

type Resolver = DnsProgress["results"][number];
const columns: ColumnDef<Resolver>[] = [
  {
    id: "ip",
    header: t("DNS 出口 IP"),
    cell: ({ row }) => <IpText ip={row.original.ip} />,
  },
  {
    accessorKey: "geo",
    header: t("归属地 / 运营商"),
    cell: ({ row }) => (
      <OverflowDetailText text={row.original.geo} title={t("DNS 归属信息")} />
    ),
  },
  {
    id: "sources",
    header: t("检测来源"),
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
    header: t("观察次数"),
    cell: ({ row }) => <NumberTicker value={row.original.samples} />,
  },
];
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
      <PageHeading title={t("DNS 出口查询")} description="" />
      <div className="toolbar">
        <ActionButton
          busy={query.isFetching}
          onClick={() => setRound((n) => n + 1)}
        >
          {query.isFetching ? t("检测中...") : t("重新检测")}
        </ActionButton>
        <span className="small muted">
          <NumberTicker value={state?.count ?? 0} />/{dnsSampleCount}
          {t("次采样 ·")} {state?.failed ?? 0}
          {t("次失败")}
        </span>
      </div>
      <ErrorNotice error={query.error} />
      {state && state.failed > 0 && (
        <p className="small muted mb-3">
          {t("部分探测失败，不代表没有 DNS 泄漏。")}{" "}
          {Object.entries(state.failures)
            .map(([source, count]) => `${source}: ${count}`)
            .join(" · ")}
        </p>
      )}
      <Card>
        <CardContent>
          <DataTable
            className="dns-exit-table"
            data={state?.results ?? []}
            columns={columns}
            getRowId={(row) => row.ip}
            animateChanges={false}
            animateEntries
            empty={
              query.isFetching ? (
                <Pending>{t("正在等待解析结果...")}</Pending>
              ) : (
                t("未检测到 DNS 出口")
              )
            }
          />
        </CardContent>
      </Card>
      <p className="small muted mt-3">
        {t(
          "相同出口合并显示；出口数量取决于实际解析路径，不代表设备配置了相同数量的 DNS。",
        )}
      </p>
    </>
  );
}
