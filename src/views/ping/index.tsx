import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CompactText } from "@/components/compact-text";
import { CountryFlag } from "@/components/country-flag";
import { LookupForm } from "@/components/lookup-form";
import { NumberTicker } from "@/components/number-ticker";
import { DataTable, ErrorNotice, Pending } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  runPing,
  getPingNodes,
  type PingResponse,
  type PingInput,
} from "./api";
import { selectPingPresets } from "./presets";

const regionBatchSize = 40;
const regionNames = new Intl.DisplayNames(["zh-CN"], { type: "region" });
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
    header: "节点",
    cell: ({ row }) => (
      <span className="site-cell">
        <CountryFlag code={row.original.country} />
        <CompactText text={row.original.name} />
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "状态",
    cell: ({ row }) =>
      row.original.status === "测试中..." ? (
        <Pending>测试中...</Pending>
      ) : (
        <Badge
          variant={
            row.original.status === "失败" ||
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
    header: ["最小", "平均", "最大"][i],
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
    header: "丢包",
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

const regions = [
  { id: "AS", name: "亚洲" },
  { id: "EU", name: "欧洲" },
  { id: "NA", name: "北美" },
  { id: "SA", name: "南美" },
  { id: "AF", name: "非洲" },
  { id: "OC", name: "大洋洲" },
];
export default function PingPage() {
  const [params, setParams] = useSearchParams();
  const [scope, setScope] = useState("world");
  const [fullCoverage, setFullCoverage] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(regionBatchSize);
  const regionList = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState<PingResponse>();
  const [stopped, setStopped] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    document.title = "全球 Ping - IP 网络工具";
    return () => controller.current?.abort();
  }, []);
  const catalog = useQuery({
    queryKey: ["ping-node-catalog-v3"],
    queryFn: ({ signal }) => getPingNodes(signal),
    staleTime: 300_000,
    retry: false,
  });
  const nodes = useMemo(() => catalog.data ?? [], [catalog.data]);
  const shown = useMemo(
    () =>
      open
        ? nodes.filter((node) =>
            `${regionNames.of(node.cc.toUpperCase())} ${node.city} ${node.cc}`
              .toLowerCase()
              .includes(search.trim().toLowerCase()),
          )
        : [],
    [nodes, open, search],
  );
  const { chinaNodes, availableNodes, presetNodes } = selectPingPresets(
    nodes,
    scope,
    fullCoverage,
  );
  const planned = scope === "custom" ? selected.length : presetNodes.length;
  const query = useMutation({
    mutationFn: async (input: PingInput) => {
      controller.current?.abort();
      controller.current = new AbortController();
      return runPing(input, controller.current.signal, setProgress);
    },
    retry: false,
  });
  const data = progress ?? query.data;
  const done =
    data?.results.filter((item) =>
      ["finished", "failed"].includes(item.result.status),
    ).length ?? 0;
  const rows: Row[] = (data?.results ?? []).map((item, index) => ({
    id: String(index),
    name: `${item.probe.city} · ${item.probe.network}`,
    country: item.probe.country,
    status:
      item.result.status === "finished"
        ? item.result.stats?.avg == null || item.result.stats.avg < 0
          ? "无响应"
          : "完成"
        : item.result.status === "failed"
          ? "失败"
          : query.isPending
            ? "测试中..."
            : "未完成",
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
    <div className="lookup-page ping-page">
      <div className="lookup-search-card">
        <LookupForm
          grouped
          value={params.get("host") ?? ""}
          placeholder="输入 IP 地址或域名"
          label="开始"
          busy={query.isPending || catalog.isPending}
          onSubmit={(host) => {
            setParams({ host });
            setProgress(undefined);
            setStopped(false);
            query.reset();
            query.mutate({
              host,
              preferred: scope !== "custom" && !fullCoverage,
              nodes:
                scope === "custom"
                  ? selected
                  : presetNodes.map((node) => node.id),
            });
          }}
        />
      </div>
      <Card className="mt-3">
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {[{ id: "world", name: "全球检测" }, ...regions].map((region) => (
              <Button
                key={region.id}
                size="sm"
                variant={scope === region.id ? "secondary" : "ghost"}
                disabled={query.isPending}
                onClick={() => {
                  setScope(region.id);
                }}
              >
                {region.name}
              </Button>
            ))}
            <Dialog
              open={open}
              onOpenChange={(value) => {
                setOpen(value);
                if (value) setVisibleCount(regionBatchSize);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant={scope === "custom" ? "secondary" : "ghost"}
                  disabled={query.isPending}
                >
                  自定义地区{selected.length ? ` (${selected.length})` : ""}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>自定义探测地区</DialogTitle>
                  <DialogDescription>
                    按国家或城市搜索，每个城市选择一个在线探针；自定义最多选择
                    50 个城市。
                  </DialogDescription>
                </DialogHeader>
                <Input
                  placeholder="搜索国家 / 城市"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setVisibleCount(regionBatchSize);
                    regionList.current?.scrollTo({ top: 0 });
                  }}
                />
                <div className="flex items-center justify-between text-xs">
                  <span>已选 {selected.length} 个地区</span>
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSelected((previous) =>
                          [
                            ...new Set([
                              ...previous,
                              ...shown.map((node) => node.id),
                            ]),
                          ].slice(0, 50),
                        )
                      }
                    >
                      添加搜索结果（最多 50 个）
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelected([])}
                    >
                      清空
                    </Button>
                  </div>
                </div>
                <ErrorNotice error={catalog.error} />
                {catalog.isPending ? (
                  <Pending>加载在线地区...</Pending>
                ) : (
                  <div
                    ref={regionList}
                    className="grid max-h-80 grid-cols-1 gap-2 overflow-auto sm:grid-cols-2"
                    onScroll={(event) => {
                      const list = event.currentTarget;
                      if (
                        list.scrollHeight - list.scrollTop - list.clientHeight <
                        100
                      )
                        setVisibleCount((count) =>
                          Math.min(count + regionBatchSize, shown.length),
                        );
                    }}
                  >
                    {shown.slice(0, visibleCount).map((node) => (
                      <label
                        key={node.id}
                        className="flex min-w-0 items-center gap-2 text-xs"
                      >
                        <Checkbox
                          checked={selected.includes(node.id)}
                          disabled={
                            !selected.includes(node.id) && selected.length >= 50
                          }
                          onCheckedChange={(checked) =>
                            setSelected((previous) =>
                              checked
                                ? [...new Set([...previous, node.id])].slice(
                                    0,
                                    50,
                                  )
                                : previous.filter((id) => id !== node.id),
                            )
                          }
                        />
                        <CountryFlag code={node.cc} />
                        <CompactText
                          text={`${regionNames.of(node.cc.toUpperCase())} · ${node.city}`}
                        />
                      </label>
                    ))}
                    {!shown.length && (
                      <p className="col-span-full py-4 text-center text-muted-foreground">
                        没有匹配的地区
                      </p>
                    )}
                    {visibleCount < shown.length && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="col-span-full"
                        onClick={() =>
                          setVisibleCount((count) =>
                            Math.min(count + regionBatchSize, shown.length),
                          )
                        }
                      >
                        加载更多（已显示 {Math.min(visibleCount, shown.length)}{" "}
                        / {shown.length}）
                      </Button>
                    )}
                  </div>
                )}
                <Button
                  disabled={!selected.length}
                  onClick={() => {
                    setScope("custom");
                    setOpen(false);
                  }}
                >
                  使用所选地区
                </Button>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {scope === "custom"
                ? `已选 ${selected.length}/50 个城市`
                : `${fullCoverage ? "完整覆盖" : "优选模式"} · ${planned} 个探测地区，预计消耗 ${planned} 次探针额度`}
            </span>
            {planned > 50 && <span>分 {Math.ceil(planned / 50)} 批测试</span>}
          </div>
          {scope !== "custom" && (
            <>
              <div className="flex items-center gap-2 text-xs">
                <Button
                  size="sm"
                  variant={fullCoverage ? "ghost" : "secondary"}
                  disabled={query.isPending}
                  onClick={() => setFullCoverage(false)}
                >
                  优选模式
                </Button>
                <Button
                  size="sm"
                  variant={fullCoverage ? "secondary" : "ghost"}
                  disabled={query.isPending}
                  onClick={() => setFullCoverage(true)}
                >
                  完整覆盖（{availableNodes.length} 个地区）
                </Button>
              </div>
              <ErrorNotice error={catalog.error} />
              {catalog.isPending ? (
                <Pending>加载常用方案...</Pending>
              ) : (
                <div className="space-y-2">
                  {regions
                    .filter(
                      (region) =>
                        scope === "world" ||
                        region.id === scope ||
                        (!fullCoverage && region.id === "AS"),
                    )
                    .map((region) => {
                      const items = presetNodes.filter(
                        (node) => node.continent === region.id,
                      );
                      return items.length ? (
                        <details key={region.id} className="text-xs">
                          <summary className="cursor-pointer py-1 text-muted-foreground">
                            {region.name} · {items.length} 个探测地区
                          </summary>
                          <div className="flex max-h-40 flex-wrap gap-1 overflow-auto pt-2">
                            {items.map((node) => (
                              <Badge key={node.id} variant="secondary">
                                <CountryFlag code={node.cc} />
                                <CompactText
                                  text={`${regionNames.of(node.cc.toUpperCase())} · ${node.city}${!fullCoverage && node.preferredNetwork ? ` · ${node.preferredNetwork}` : ""}`}
                                />
                              </Badge>
                            ))}
                          </div>
                        </details>
                      ) : null;
                    })}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                优选模式优先加入 2
                个中国大陆城市用于对照；其他地区优先大型云厂商，缺少时使用在线节点。全球每洲另选最多
                2 个、单洲最多 5 个。相同组合 60 秒内复用结果。Ping
                失败不能单独判定被墙。
                {chinaNodes.length < 2 &&
                  ` 当前只有 ${chinaNodes.length} 个中国大陆城市在线。`}
              </p>
            </>
          )}
          {scope === "custom" && (
            <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
              {selected.map((id) => (
                <Badge variant="secondary" key={id}>
                  {id}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {!query.isIdle && (
        <>
          <div className="my-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {data?.reusedAt
                ? `复用 ${new Date(data.reusedAt).toLocaleTimeString("zh-CN")} 的测量结果`
                : stopped
                  ? "已停止"
                  : query.isPending
                    ? "测试中..."
                    : query.isError
                      ? "部分测量未完成"
                      : "测量完成"}{" "}
              · <NumberTicker value={done} /> 个节点已返回 ·
              平均延迟从高到低，未返回数值置底
            </span>
            {query.isPending && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setStopped(true);
                  controller.current?.abort();
                }}
              >
                停止检测
              </Button>
            )}
          </div>
          {!stopped && <ErrorNotice error={query.error} />}
          <Card>
            <CardContent>
              <DataTable
                className="ping-table"
                getRowClassName={(row) =>
                  row.avg == null ||
                  !Number.isFinite(row.avg) ||
                  row.avg < 0 ||
                  row.status === "失败"
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
                  query.isPending ? (
                    <Pending>等待远端探针...</Pending>
                  ) : (
                    "暂无结果"
                  )
                }
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
