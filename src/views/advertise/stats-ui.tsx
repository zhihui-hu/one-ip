import { lazy, Suspense, type ReactNode } from "react";
import { NumberTicker } from "@/components/number-ticker";
import { SiteLogo } from "@/components/site-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { chartPalette } from "./chart-palette";
import type { ChartSeries } from "./traffic-chart";
import type { Unavailable } from "./types";

// ECharts only loads with the advertising page's charts.
const TrafficChart = lazy(() => import("./traffic-chart"));

export function SourceCard({
  logo,
  title,
  aside,
  children,
}: {
  logo: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
            <SiteLogo website={logo} className="size-4" />
            <span className="truncate">{title}</span>
          </CardTitle>
          {aside}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  );
}

export function UnavailableNote({ reason }: { reason: Unavailable["reason"] }) {
  return (
    <p className="m-0 rounded-[12px] bg-muted/50 px-3 py-6 text-center text-sm text-muted-foreground">
      {t(`advertise.unavailable.${reason}`)}
    </p>
  );
}

/** KPI tile; selectable tiles switch the chart below. */
export function MetricTile({
  label,
  value,
  format,
  selected,
  onSelect,
}: {
  label: string;
  value: number;
  format: (value: number) => string;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const body = (
    <>
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <strong className="text-xl leading-tight font-semibold tabular-nums">
        <NumberTicker value={value} formatValue={format} />
      </strong>
    </>
  );
  const className = cn(
    "flex min-w-0 flex-col items-start gap-1 rounded-[12px] border p-3 text-left",
    selected
      ? "border-primary/40 bg-primary/5"
      : "border-transparent bg-muted/50",
  );
  return onSelect ? (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        className,
        "cursor-pointer transition-colors hover:border-primary/30 focus-visible:outline-2 focus-visible:outline-ring",
      )}
    >
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function ChartPanel({
  title,
  aside,
  labels,
  series,
  format,
}: {
  title: string;
  aside?: ReactNode;
  labels: string[];
  series: ChartSeries[];
  format: (value: number) => string;
}) {
  return (
    <section aria-label={title}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
        <span>{title}</span>
        <span className="flex items-center gap-3">
          {series.length > 1 &&
            series.map((item, index) => (
              <span
                key={item.name}
                className="inline-flex items-center gap-1.5"
              >
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ backgroundColor: chartPalette[index] }}
                />
                {item.name}
              </span>
            ))}
          {aside}
        </span>
      </div>
      <Suspense fallback={<Skeleton className="h-56 w-full" />}>
        <TrafficChart
          labels={labels}
          series={series}
          format={format}
          label={title}
        />
      </Suspense>
    </section>
  );
}

/** Ranked rows with a share bar, e.g. top regions. */
export function RankedList({
  title,
  items,
  format,
}: {
  title: string;
  items: { key: string; label: ReactNode; value: number; share: number }[];
  format: (value: number) => string;
}) {
  if (!items.length) return null;
  return (
    <section>
      <h3 className="m-0 mb-2 text-[12px] font-normal text-muted-foreground">
        {title}
      </h3>
      <ol className="m-0 grid list-none gap-x-6 gap-y-2 p-0 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.key} className="grid gap-1">
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <span className="flex min-w-0 items-center gap-2 truncate">
                {item.label}
              </span>
              <span className="flex-none tabular-nums text-muted-foreground">
                {format(item.value)}
                <span className="ml-2 inline-block w-12 text-right text-subtle">
                  {item.share.toFixed(1)}%
                </span>
              </span>
            </div>
            <span className="h-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-primary/70"
                style={{ width: `${Math.min(100, item.share)}%` }}
              />
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function SourceNote({ children }: { children: ReactNode }) {
  return <p className="m-0 text-[11px] text-subtle">{children}</p>;
}
