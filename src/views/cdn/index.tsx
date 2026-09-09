import { useState } from "react";
import { DetailText } from "@/components/detail-text";
import { SiteLogo } from "@/components/site-logo";
import {
  PageHeading,
  Pending,
  ActionButton,
  DataTable,
} from "@/components/toolkit";
import { Card, CardContent } from "@/components/ui/card";
import { request } from "@/lib/network";
import { useQueries } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { providers, providerWebsite } from "./providers";

type Row = {
  name: string;
  node?: string;
  cache?: string;
  loading: boolean;
  error?: string;
};
const columns: ColumnDef<Row>[] = [
  {
    accessorKey: "name",
    header: "厂商",
    cell: ({ row }) => (
      <span className="site-cell">
        <SiteLogo website={providerWebsite(row.original.name)} />
        <DetailText text={row.original.name} title="CDN 厂商" />
      </span>
    ),
  },
  {
    id: "node",
    header: "节点 / 响应标识",
    cell: ({ row }) =>
      row.original.loading ? (
        <Pending>检测中...</Pending>
      ) : (
        <DetailText text={row.original.node ?? "未知"} />
      ),
  },
  {
    accessorKey: "cache",
    header: "缓存",
    cell: ({ row }) => (
      <DetailText text={row.original.cache ?? "—"} title="缓存状态" />
    ),
  },
  {
    id: "status",
    header: "状态",
    cell: ({ row }) =>
      row.original.loading ? (
        <Pending>检测中...</Pending>
      ) : (
        <DetailText text={row.original.error ?? "已完成"} />
      ),
  },
];
export default function CdnPage() {
  const [round, setRound] = useState(0);
  const queries = useQueries({
    queries: providers.map((provider) => ({
      queryKey: ["cdn-node-v2", provider.name, round],
      retry: false,
      staleTime: 0,
      refetchOnWindowFocus: false,
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        if (provider.trace || provider.text) {
          const text = await request<string>(
            provider.url,
            { signal, cache: "no-store" },
            "text",
          );
          const node = provider.trace
            ? text.match(/^colo=(.+)$/m)?.[1]?.trim()
            : text.trim();
          if (!node || node.length > 200 || node.includes("<"))
            throw new Error("未返回有效节点标识");
          return { node, cache: "—" };
        }
        const headers = await request<Headers>(
          provider.url,
          { signal, method: "HEAD", cache: "no-store" },
          "headers",
        );
        const values = (provider.headers ?? []).flatMap((key) => {
          const value = headers.get(key);
          if (!value) return [];
          if (key === "xcc") {
            try {
              return [`${key}: ${atob(value)}`];
            } catch {
              return [];
            }
          }
          if (key === "server" && !/bunnycdn-[\w-]+/i.test(value)) return [];
          return [`${key}: ${value}`];
        });
        if (!values.length) throw new Error("节点头未公开或跨域受限");
        return {
          node: values.join(" · "),
          cache:
            headers.get("x-cache") ?? headers.get("cf-cache-status") ?? "—",
        };
      },
    })),
  });
  const busy = queries.some((query) => query.isFetching);
  return (
    <>
      <PageHeading title="CDN 命中节点" description="" />
      <div className="toolbar">
        <ActionButton busy={busy} onClick={() => setRound((n) => n + 1)}>
          {busy ? "检测中..." : "重新检测"}
        </ActionButton>
        <span className="small muted">
          {queries.filter((query) => query.isSuccess).length}/{providers.length}{" "}
          可读取
        </span>
      </div>
      <Card>
        <CardContent>
          <DataTable
            className="cdn-table"
            columns={columns}
            getRowId={(row) => row.name}
            animateChanges={false}
            data={providers.map((provider, index) => ({
              name: provider.name,
              ...queries[index].data,
              loading: queries[index].isFetching,
              error: queries[index].error?.message,
            }))}
          />
        </CardContent>
      </Card>
    </>
  );
}
