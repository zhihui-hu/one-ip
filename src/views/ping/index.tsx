import { useSearchParams } from "react-router-dom";
import { LookupForm } from "@/components/lookup-form";
import { PageHeading, DataTable, ErrorNotice } from "@/components/toolkit";
import { Checkbox } from "@/components/ui/checkbox";
import { useDiagnostic } from "@/hooks/use-diagnostic";
import { flag } from "@/lib/network";
import type { ColumnDef } from "@tanstack/react-table";
import { useAtom } from "jotai";
import { runPing } from "./api";
import nodes from "./nodes.json";
import { selectedNodesAtom } from "./store";

interface Row {
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
    header: "节点",
    cell: ({ row }) => (
      <span>
        {flag(row.original.country)} {row.original.name}
      </span>
    ),
  },
  ...(["min", "avg", "max"] as const).map((key, i) => ({
    accessorKey: key,
    header: ["最小", "平均", "最大"][i],
    cell: ({ row }: { row: { original: Row } }) =>
      row.original[key] == null ? "—" : `${row.original[key]!.toFixed(1)} ms`,
  })),
  {
    accessorKey: "loss",
    header: "丢包",
    cell: ({ row }) =>
      row.original.loss == null ? "—" : `${row.original.loss}%`,
  },
];
export default function PingPage() {
  const [params, setParams] = useSearchParams();
  const host = params.get("host") ?? "";
  const [selected, setSelected] = useAtom(selectedNodesAtom);
  const query = useDiagnostic(runPing);
  const rows: Row[] = query.data
    ? query.data.results.map((item) => ({
        name: `${item.probe.city} · ${item.probe.network}`,
        country: item.probe.country,
        ...item.result.stats,
      }))
    : nodes
        .filter((n) => selected.includes(n.id))
        .map((n) => ({ name: `${n.name} ${n.city}`, country: n.cc }));
  return (
    <>
      <PageHeading
        title="全球 Ping 测试"
        description="从全球 20 个候选地区检测目标 IP 的网络延迟"
      />
      <LookupForm
        value={host}
        placeholder="输入 IP 地址或域名，例如 1.1.1.1"
        label="Ping"
        busy={query.isPending}
        onSubmit={(value) => {
          setParams({ host: value });
          query.mutate({ host: value, nodes: selected });
        }}
      />
      <fieldset className="node-picker">
        <legend>探测地区（实际节点以 Globalping 返回为准）</legend>
        {nodes.map((node) => (
          <label key={node.id}>
            <Checkbox
              checked={selected.includes(node.id)}
              disabled={query.isPending}
              onCheckedChange={(checked) =>
                setSelected((previous) =>
                  checked
                    ? [...previous, node.id]
                    : previous.filter((id) => id !== node.id),
                )
              }
            />
            {flag(node.cc)} {node.name}
          </label>
        ))}
      </fieldset>
      <ErrorNotice error={query.error} />
      <p className="status-line" role="status">
        {query.isPending
          ? "正在创建全球 ICMP 测量并等待节点返回…"
          : query.data
            ? `测量完成 · ${query.data.results.length} 个真实节点`
            : "选择地区并输入目标开始测试"}
      </p>
      <DataTable data={rows} columns={columns} empty="请至少选择一个节点" />
      <p className="principle">
        测试原理：Worker 向 Globalping 提交 ICMP
        测量并轮询结果。延迟来自远端探测节点，不是你的浏览器或 Worker
        到目标的延迟。无可用探针、目标屏蔽 ICMP、额度限制都会影响结果；不会用
        HTTP 耗时伪装 Ping。
      </p>
    </>
  );
}
