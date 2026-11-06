import { useEffect, useRef } from "react";
import { useTheme } from "@/hooks/use-theme";
import { LineChart, type LineSeriesOption } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  type GridComponentOption,
  type TooltipComponentOption,
} from "echarts/components";
import {
  init,
  graphic,
  use as registerECharts,
  type ComposeOption,
} from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { chartPalette } from "./chart-palette";

registerECharts([LineChart, GridComponent, TooltipComponent, SVGRenderer]);

export interface ChartSeries {
  name: string;
  values: number[];
}

// ECharts needs hex colours rather than the theme's oklch() values.
const palette = chartPalette;

/** Area line chart in the style of the Cloudflare dashboard. */
export default function TrafficChart({
  labels,
  series,
  format,
  label,
}: {
  labels: string[];
  series: ChartSeries[];
  format: (value: number) => string;
  label: string;
}) {
  const { resolvedTheme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const dark = resolvedTheme === "dark";
    const muted = dark ? "#8b949e" : "#6e7781";
    const grid = dark ? "#30363d" : "#e1e4e8";
    const chart = init(element, null, { renderer: "svg" });
    const option: ComposeOption<
      LineSeriesOption | GridComponentOption | TooltipComponentOption
    > = {
      animation: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      animationDuration: 500,
      grid: { left: 4, right: 8, top: 12, bottom: 4, containLabel: true },
      tooltip: {
        trigger: "axis",
        backgroundColor: dark ? "#161b22" : "#fff",
        borderColor: grid,
        textStyle: { color: dark ? "#e6edf3" : "#1f2328", fontSize: 12 },
        axisPointer: { type: "line", lineStyle: { color: muted, width: 1 } },
        valueFormatter: (value) => format(Number(value)),
      },
      xAxis: {
        type: "category",
        data: labels,
        boundaryGap: false,
        axisLine: { lineStyle: { color: grid } },
        axisTick: { show: false },
        axisLabel: { color: muted, fontSize: 10, hideOverlap: true },
      },
      yAxis: {
        type: "value",
        min: 0,
        splitNumber: 4,
        axisLabel: {
          color: muted,
          fontSize: 10,
          formatter: (value: number) => format(value),
        },
        splitLine: { lineStyle: { color: grid, type: "dashed" } },
      },
      series: series.map((item, index): LineSeriesOption => ({
        type: "line",
        name: item.name,
        data: item.values,
        showSymbol: false,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { width: 2, color: palette[index] },
        itemStyle: { color: palette[index] },
        areaStyle:
          index === 0
            ? {
                color: new graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: "rgba(25, 118, 210, 0.22)" },
                  { offset: 1, color: "rgba(25, 118, 210, 0.02)" },
                ]),
              }
            : undefined,
      })),
    };
    chart.setOption(option);
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [labels, series, format, resolvedTheme]);
  return (
    <div ref={ref} role="img" aria-label={label} className="h-56 w-full" />
  );
}
