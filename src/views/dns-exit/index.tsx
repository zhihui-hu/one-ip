import { useState } from "react";
import { DetailText } from "@/components/detail-text";
import { NumberTicker } from "@/components/number-ticker";
import {
  PageHeading,
  DataTable,
  IpText,
  ActionButton,
  ErrorNotice,
  Pending,
} from "@/components/toolkit";
import { Card, CardContent } from "@/components/ui/card";
import { request } from "@/lib/network";
import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";

type Resolver = { ip: string; geo: string; samples: number };
type Progress = { results: Resolver[]; count: number; failed: number };
const samples = 6;
const columns: ColumnDef<Resolver>[] = [
  {
    id: "ip",
    header: "DNS 出口 IP",
    cell: ({ row }) => <IpText ip={row.original.ip} />,
  },
  {
    accessorKey: "geo",
    header: "归属地 / 运营商",
    cell: ({ row }) => (
      <DetailText text={row.original.geo} title="DNS 归属信息" />
    ),
  },
  {
    id: "samples",
    header: "观察次数",
    cell: ({ row }) => <NumberTicker value={row.original.samples} />,
  },
];
export default function DnsExitPage() {
  const [round, setRound] = useState(0);
  const client = useQueryClient();
  const progressKey = ["dns-exit-progress", round];
  const progress = useQuery<Progress>({
    queryKey: progressKey,
    enabled: false,
    queryFn: skipToken,
  });
  const query = useQuery({
    queryKey: ["dns-exit", round],
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      let state: Progress = { results: [], count: 0, failed: 0 };
      client.setQueryData(progressKey, state);
      for (let i = 0; i < samples; i++) {
        try {
          const token = crypto.randomUUID().replaceAll("-", "");
          const data = await request<{ dns?: { ip: string; geo: string } }>(
            `https://${token}.edns.ip-api.com/json`,
            { signal, cache: "no-store" },
          );
          signal.throwIfAborted();
          if (!data.dns?.ip) throw new Error("未返回 DNS 出口");
          const resolver = data.dns;
          const found = state.results.some((item) => item.ip === resolver.ip);
          state = {
            ...state,
            results: found
              ? state.results.map((item) =>
                  item.ip === resolver.ip
                    ? { ...item, samples: item.samples + 1 }
                    : item,
                )
              : [...state.results, { ...resolver, samples: 1 }],
          };
        } catch (error) {
          if (signal.aborted) throw error;
          state = { ...state, failed: state.failed + 1 };
        }
        state = { ...state, count: i + 1 };
        client.setQueryData(progressKey, state);
      }
      if (!state.results.length)
        throw new Error("DNS 出口检测失败，可能受网络、代理或跨域限制");
      return state;
    },
  });
  const state = query.isFetching
    ? progress.data
    : (query.data ?? progress.data);
  return (
    <>
      <PageHeading title="DNS 出口查询" description="" />
      <div className="toolbar">
        <ActionButton
          busy={query.isFetching}
          onClick={() => setRound((n) => n + 1)}
        >
          {query.isFetching ? "检测中..." : "重新检测"}
        </ActionButton>
        <span className="small muted">
          <NumberTicker value={state?.count ?? 0} />/{samples} 次采样 ·{" "}
          {state?.failed ?? 0} 次失败
        </span>
      </div>
      <ErrorNotice error={query.error} />
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
                <Pending>正在等待解析结果...</Pending>
              ) : (
                "未检测到 DNS 出口"
              )
            }
          />
        </CardContent>
      </Card>
      <p className="small muted mt-3">
        相同出口合并显示；出口数量取决于实际解析路径，不代表设备配置了相同数量的
        DNS。
      </p>
    </>
  );
}
