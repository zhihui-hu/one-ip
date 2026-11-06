import { useMemo, useState } from "react";
import { CountryFlag } from "@/components/country-flag";
import { AnimatedSegmentedTabs } from "@/components/ui/animated-segmented-tabs";
import { t } from "@/i18n";
import { countryName } from "@/lib/country";
import { statsConfig } from "./config";
import {
  formatBytes,
  formatCount,
  formatPercent,
  updatedLabel,
} from "./format";
import {
  ChartPanel,
  MetricTile,
  RankedList,
  SourceCard,
  SourceNote,
  UnavailableNote,
} from "./stats-ui";
import type { CloudflareStats, Metrics, RangeKey } from "./types";

const ranges: RangeKey[] = [
  "last24h",
  "today",
  "yesterday",
  "last3d",
  "last30d",
];
const hourMs = 3_600_000;
const beijing = (ms: number) => new Date(ms + 8 * hourMs).toISOString();

const cacheRate = (item: Metrics) =>
  item.bytes ? (item.cachedBytes / item.bytes) * 100 : 0;

type MetricKey =
  "uniques" | "pageViews" | "requests" | "cacheRate" | "bytes" | "cachedBytes";
const metricDefs: {
  key: MetricKey;
  label: string;
  value: (item: Metrics) => number;
  format: (value: number) => string;
}[] = [
  ...(statsConfig.showUniqueVisitors
    ? [
        {
          key: "uniques" as const,
          label: t("advertise.uniqueVisitors"),
          value: (item: Metrics) => item.uniques,
          format: formatCount,
        },
      ]
    : []),
  {
    key: "pageViews",
    label: t("advertise.pageViews"),
    value: (item) => item.pageViews,
    format: formatCount,
  },
  {
    key: "requests",
    label: t("advertise.requests"),
    value: (item) => item.requests,
    format: formatCount,
  },
  {
    key: "cacheRate",
    label: t("advertise.percentCached"),
    value: cacheRate,
    format: formatPercent,
  },
  {
    key: "bytes",
    label: t("advertise.dataServed"),
    value: (item) => item.bytes,
    format: formatBytes,
  },
  {
    key: "cachedBytes",
    label: t("advertise.dataCached"),
    value: (item) => item.cachedBytes,
    format: formatBytes,
  },
];

export function CloudflareCard({
  stats,
  updatedAt,
}: {
  stats: CloudflareStats;
  updatedAt: string;
}) {
  const [range, setRange] = useState<RangeKey>(statsConfig.defaultRange);
  const [metricKey, setMetricKey] = useState<MetricKey>(metricDefs[0].key);
  const metric =
    metricDefs.find((item) => item.key === metricKey) ?? metricDefs[0];
  const chart = useMemo(() => {
    if (!stats.available) return { labels: [], values: [] };
    if (range === "last30d") {
      // Today's UTC day has only just started; plotting it looks like a drop.
      const current = new Date(Date.parse(updatedAt))
        .toISOString()
        .slice(0, 10);
      const days = stats.daily.filter((day) => day.date !== current);
      return {
        labels: days.map((day) => day.date.slice(5)),
        values: days.map(metric.value),
      };
    }
    // Use the server snapshot time so the chart matches the totals.
    const today = beijing(Date.parse(updatedAt)).slice(0, 10);
    const yesterday = beijing(
      Date.parse(`${today}T00:00:00+08:00`) - 24 * hourMs,
    ).slice(0, 10);
    const hours = stats.hourly.map((hour) => ({
      ...hour,
      local: beijing(Date.parse(hour.time)),
    }));
    const selected =
      range === "last24h"
        ? hours.slice(-24)
        : range === "today"
          ? hours.filter((hour) => hour.local.startsWith(today))
          : range === "yesterday"
            ? hours.filter((hour) => hour.local.startsWith(yesterday))
            : hours;
    return {
      labels: selected.map((hour) =>
        range === "last3d"
          ? hour.local.slice(5, 13).replace("T", " ") + ":00"
          : hour.local.slice(11, 13) + ":00",
      ),
      values: selected.map(metric.value),
    };
  }, [stats, range, metric, updatedAt]);
  const series = useMemo(
    () => [{ name: metric.label, values: chart.values }],
    [metric, chart],
  );
  if (!stats.available)
    return (
      <SourceCard logo="https://cloudflare.com" title="Cloudflare">
        <UnavailableNote reason={stats.reason} />
      </SourceCard>
    );
  const totals = stats.ranges[range];
  const total30d = stats.ranges.last30d.requests || 1;
  const peak = Math.max(0, ...chart.values);
  return (
    <SourceCard
      logo="https://cloudflare.com"
      title="Cloudflare"
      aside={
        <AnimatedSegmentedTabs<RangeKey>
          label={t("advertise.siteData")}
          value={range}
          onValueChange={setRange}
          triggerClassName="text-xs px-2.5"
          options={ranges.map((key) => ({
            value: key,
            label: t(`advertise.range.${key}`),
          }))}
        />
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {metricDefs.map((item) => (
          <MetricTile
            key={item.key}
            label={item.label}
            value={item.value(totals)}
            format={item.format}
            selected={item.key === metric.key}
            onSelect={() => setMetricKey(item.key)}
          />
        ))}
      </div>
      <ChartPanel
        title={t(
          range === "last30d"
            ? "advertise.chartDaily"
            : "advertise.chartHourly",
          [metric.label],
        )}
        aside={t("advertise.peak", [metric.format(peak)])}
        labels={chart.labels}
        series={series}
        format={metric.format}
      />
      <RankedList
        title={t("advertise.topRegions")}
        format={formatCount}
        items={stats.countries.slice(0, 8).map((item) => ({
          key: item.country,
          label: (
            <>
              <CountryFlag code={item.country} />
              {countryName(item.country) ?? item.country}
            </>
          ),
          value: item.requests,
          share: (item.requests / total30d) * 100,
        }))}
      />
      <SourceNote>
        {t("advertise.cloudflareNote", [updatedLabel(updatedAt)])}
      </SourceNote>
    </SourceCard>
  );
}
