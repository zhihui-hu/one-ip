import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CountryFlag } from "@/components/country-flag";
import { NumberTicker } from "@/components/number-ticker";
import { ActionButton, Pending, ToolCard } from "@/components/toolkit";
import { t } from "@/i18n";
import { latencyCountries, selectLatencyNodes } from "./latency-presets";
import {
  getPingNodes,
  runPing,
  type PingResponse,
  type PingNode,
} from "../ping/api";

export function IpLatency({ ip }: { ip: string }) {
  const [busy, setBusy] = useState(false);
  const [nodes, setNodes] = useState<{ cc: string; node?: PingNode }[]>(
    latencyCountries.map((cc) => ({ cc })),
  );
  const [data, setData] = useState<PingResponse>();
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );
  const names: Record<string, string> = {
    us: t("美国"),
    de: t("德国"),
    gb: t("英国"),
    fr: t("法国"),
    jp: t("日本"),
    ca: t("加拿大"),
    cn: t("中国"),
    kr: t("韩国"),
  };
  const start = async () => {
    controller.current?.abort();
    const run = new AbortController();
    controller.current = run;
    setBusy(true);
    setCatalogLoaded(false);
    setStarted(true);
    setError("");
    setData(undefined);
    setNodes(latencyCountries.map((cc) => ({ cc })));
    try {
      const selected = selectLatencyNodes(await getPingNodes(run.signal));
      if (run.signal.aborted) return;
      setNodes(selected);
      setCatalogLoaded(true);
      const ids = selected.flatMap((item) => (item.node ? [item.node.id] : []));
      if (!ids.length) throw new Error(t("暂无可用优选探针"));
      await runPing(
        { host: ip, nodes: ids, preferred: true },
        run.signal,
        (result) => {
          if (!run.signal.aborted) setData(result);
        },
      );
    } catch (error) {
      if (!run.signal.aborted)
        setError(error instanceof Error ? error.message : t("查询失败"));
    } finally {
      if (!run.signal.aborted) setBusy(false);
    }
  };
  return (
    <ToolCard
      title={
        <span className="flex items-center justify-between gap-2">
          <span>{t("全球延迟测试")}</span>
          <span className="flex shrink-0 items-center gap-2">
            <Link
              className="text-xs font-normal text-muted-foreground hover:text-primary"
              to={`/network/ping/?host=${encodeURIComponent(ip)}`}
            >
              {t("查看完整测试")}
            </Link>
            <ActionButton
              size="sm"
              className="h-7 px-2 text-xs"
              variant="ghost"
              busy={busy}
              onClick={start}
            >
              {busy ? t("检测中…") : started ? t("重新检测") : t("开始测试")}
            </ActionButton>
          </span>
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
        {nodes.map(({ cc, node }) => {
          const result = data?.results.find(
            (item) => item.probe.country.toLowerCase() === cc,
          );
          const stats = result?.result.stats;
          const latency =
            stats && stats.loss < 100 && Number.isFinite(stats.avg)
              ? stats.avg
              : undefined;
          return (
            <div
              key={cc}
              className="flex min-w-0 items-center justify-between gap-2 rounded-md bg-muted/30 px-2 py-2"
              title={
                node
                  ? `${node.city} · ${node.preferredNetwork ?? ""} · AS${node.preferredAsn}${stats ? ` · ${t("丢包")} ${stats.loss}%` : ""}`
                  : undefined
              }
            >
              <div className="flex min-w-0 items-center gap-1.5 text-xs">
                <CountryFlag code={cc} />
                <span className="truncate">{names[cc]}</span>
              </div>
              <div
                className="shrink-0 text-sm font-semibold tabular-nums"
                style={{
                  color:
                    latency == null
                      ? undefined
                      : latency < 100
                        ? "var(--success)"
                        : latency < 250
                          ? "var(--good)"
                          : "var(--warning)",
                }}
              >
                {latency != null ? (
                  <>
                    <NumberTicker value={latency} />
                    <span className="ml-1 text-xs font-normal">ms</span>
                  </>
                ) : busy &&
                  (!result || result.result.status === "in-progress") ? (
                  <Pending>···</Pending>
                ) : (
                  <span className="text-xs font-normal text-muted-foreground">
                    {!started
                      ? t("待检测")
                      : !node
                        ? catalogLoaded
                          ? t("暂无优选探针")
                          : t("查询失败")
                        : t("未取得响应")}
                  </span>
                )}
              </div>
              {stats && stats.loss > 0 && (
                <span
                  className="shrink-0 text-[10px] text-destructive"
                  title={t("丢包")}
                >
                  <NumberTicker value={stats.loss} />%
                </span>
              )}
            </div>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </ToolCard>
  );
}
