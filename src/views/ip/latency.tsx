import { Link } from "react-router-dom";
import { CountryFlag } from "@/components/country-flag";
import { NumberTicker } from "@/components/number-ticker";
import { ActionButton, Pending, ToolCard } from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { ArrowUpRight, Play, RotateCw } from "lucide-react";
import type { useIpLatency } from "./use-ip-latency";

export function IpLatency({
  measurement,
}: {
  measurement: ReturnType<typeof useIpLatency>;
}) {
  const { ip, busy, nodes, data, error, started, catalogLoaded, names, start } =
    measurement;
  return (
    <ToolCard
      className="ip-latency-card"
      title={
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span>{t("common.globalLatencyTest")}</span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            <Button asChild size="sm" variant="outline" className="text-xs">
              <Link to={`/ping/?host=${encodeURIComponent(ip)}`}>
                {t("ip.latency.fullTestLabel")}
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
            <ActionButton
              size="sm"
              className="text-xs"
              variant="default"
              busy={busy}
              onClick={start}
            >
              {!busy &&
                (started ? (
                  <RotateCw aria-hidden="true" />
                ) : (
                  <Play aria-hidden="true" />
                ))}
              {busy
                ? t("common.checking")
                : started
                  ? t("common.runAgain")
                  : t("ip.latency.startTest")}
            </ActionButton>
          </span>
        </span>
      }
    >
      {(!error || Boolean(data?.results.length)) && (
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 sm:grid-cols-4">
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
                className="flex min-w-0 flex-wrap items-center justify-between gap-x-1 gap-y-0.5 rounded-[6px] bg-muted px-1 py-[5px]"
                title={
                  node
                    ? `${node.city} · ${node.preferredNetwork ?? ""} · AS${node.preferredAsn}${stats ? ` · ${t("common.packetLoss")} ${stats.loss}%` : ""}`
                    : undefined
                }
              >
                <div className="flex min-w-0 items-center gap-1 text-[11px]">
                  <CountryFlag code={cc} />
                  <span className="truncate">{names[cc]}</span>
                </div>
                <div
                  className="text-[12px] font-semibold whitespace-nowrap tabular-nums"
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
                      <span className="ml-0.5 text-[10px] font-normal">ms</span>
                    </>
                  ) : busy &&
                    (!result || result.result.status === "in-progress") ? (
                    <Pending>···</Pending>
                  ) : (
                    <span className="text-[10px] font-normal text-muted-foreground">
                      {!started
                        ? t("common.notChecked")
                        : !node
                          ? catalogLoaded
                            ? t("ip.latency.noPreferredProbe")
                            : t("ip.latency.lookupFailed")
                          : t("common.noResponse")}
                    </span>
                  )}
                </div>
                {stats && stats.loss > 0 && (
                  <span
                    className="ml-auto text-[10px] text-destructive"
                    title={t("common.packetLoss")}
                  >
                    <NumberTicker value={stats.loss} />%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </ToolCard>
  );
}
