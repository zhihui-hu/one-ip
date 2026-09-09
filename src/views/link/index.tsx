import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { CountryFlag } from "@/components/country-flag";
import { LatencyBadge } from "@/components/latency-badge";
import { NumberTicker } from "@/components/number-ticker";
import { SiteLogo } from "@/components/site-logo";
import { ActionButton, DataTable } from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SplitResults } from "@/views/home/split-results";
import { skipToken, useQueries, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useAtom } from "jotai";
import { testConnectivity, type ProbeResult } from "./api";
import { connectivityRoundAtom } from "./store";
import targets from "./targets.json";

const groups = [
  ["cn", "中国"],
  ["jp", "日本"],
  ["us", "美国"],
  ["gl", "全球"],
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
    <span ref={ref} className="site-cell">
      {row.started ? (
        <SiteLogo src={row.icon} />
      ) : (
        <span className="site-icon" />
      )}
      {name}
    </span>
  );
}

const columns: ColumnDef<ConnectivityRow>[] = [
  {
    accessorKey: "name",
    header: "网站",
    cell: ({ row }) => <ObservedSite row={row.original} />,
  },
  {
    id: "samples",
    header: "测试记录",
    cell: ({ row }) => (
      <div
        className="ping-dots"
        aria-label={`${row.original.result?.samples.length ?? 0}/8 次测试`}
      >
        {Array.from({ length: 8 }, (_, index) => {
          const sample = row.original.result?.samples[index];
          return (
            <span
              key={index}
              title={
                sample == null
                  ? "等待测试"
                  : sample < 0
                    ? "未知"
                    : `${sample}ms`
              }
              className={`ping-dot ${sample == null ? "" : sample < 0 ? "dot-fail" : sample < 100 ? "dot-good" : sample < 400 ? "dot-warn" : "dot-slow"}`}
            />
          );
        })}
      </div>
    ),
  },
  {
    id: "latency",
    header: "延迟",
    cell: ({ row }) =>
      !row.original.started ? (
        "—"
      ) : (
        <LatencyBadge
          result={row.original.result}
          running={row.original.running}
        />
      ),
  },
];

function ConnectivityGroup({ cc, label }: { cc: string; label: string }) {
  const [rounds, setRounds] = useAtom(connectivityRoundAtom);
  const round = rounds[cc] ?? 0;
  const groupTargets = targets.filter((target) => target.cc === cc);
  const client = useQueryClient();
  const visible = useRef(new Set<string>());
  const [started, setStarted] = useState<Set<string>>(() => new Set());
  const observe = useCallback((name: string, inView: boolean) => {
    if (inView) {
      visible.current.add(name);
      setStarted((previous) =>
        previous.has(name) ? previous : new Set(previous).add(name),
      );
    } else visible.current.delete(name);
  }, []);
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
    <section className="country-block connectivity-section">
      <div className="connectivity-heading">
        <h2>
          <CountryFlag code={cc === "gl" ? undefined : cc} />
          {label}
        </h2>
        <div className="connectivity-actions">
          <span className="small muted">
            可读取响应{" "}
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
            aria-label={busy ? `${label}测试中...` : `重新测试${label}`}
          >
            {busy ? "测试中..." : "重新测试"}
          </ActionButton>
        </div>
      </div>
      <Card>
        <CardContent>
          <DataTable
            className="connectivity-table"
            columns={columns}
            data={tableRows}
            getRowId={(row) => row.name}
            animateChanges={false}
            animateSorting
          />
        </CardContent>
      </Card>
    </section>
  );
}

export default function LinkPage() {
  const [params, setParams] = useSearchParams();
  const exits = params.get("view") === "exits";
  useEffect(() => {
    document.title = "网络连通 - IP 网络工具";
  }, []);
  return (
    <>
      <h1 className="sr-only">网络连通性测试</h1>
      <div className="mb-3 flex gap-2" role="group" aria-label="检测类型">
        <Button
          variant={exits ? "ghost" : "secondary"}
          onClick={() => setParams({})}
        >
          连通测试
        </Button>
        <Button
          variant={exits ? "secondary" : "ghost"}
          onClick={() => setParams({ view: "exits" })}
        >
          分流出口
        </Button>
      </div>
      {exits ? (
        <SplitResults />
      ) : (
        <>
          <div className="legend mb-2 text-xs">
            <i className="dot-good" />优 <i className="dot-warn" />良
            <i className="dot-slow" />慢 <i className="dot-fail" />
            未知
          </div>
          {groups.map(([cc, label]) => (
            <ConnectivityGroup key={cc} cc={cc} label={label} />
          ))}
          <p className="principle">
            浏览器 HTTP 请求耗时，取 8 轮成功请求的中位数，非 ICMP
            Ping。跨域限制或超时可能导致未知结果。
          </p>
        </>
      )}
    </>
  );
}
