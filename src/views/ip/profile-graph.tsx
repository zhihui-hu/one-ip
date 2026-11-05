import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ToolCard } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useTheme } from "@/hooks/use-theme";
import { t } from "@/i18n";
import {
  BarChart,
  ScatterChart,
  type BarSeriesOption,
  type ScatterSeriesOption,
} from "echarts/charts";
import {
  GridComponent,
  GraphicComponent,
  type GridComponentOption,
  type GraphicComponentOption,
} from "echarts/components";
import {
  init,
  graphic,
  use as registerECharts,
  type ComposeOption,
} from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { gsap } from "gsap";
import { Info } from "lucide-react";
import type { CoffeeIp } from "./coffee";
import type { ipProfile } from "./profile";
import { ipProfileFields } from "./profile-fields";
import { ScenarioPanel } from "./scenario-panel";
import { reputationScaleClass } from "./styles";
import type { useIpLatency } from "./use-ip-latency";

registerECharts([
  BarChart,
  ScatterChart,
  GridComponent,
  GraphicComponent,
  SVGRenderer,
]);

const catalogTagClass = "text-[10px] text-primary";

const bands = [
  { size: 45, range: "0–44", label: t("ip.profile.low") },
  { size: 30, range: "45–74", label: t("ip.profile.fair") },
  { size: 15, range: "75–89", label: t("ip.profile.good") },
  { size: 10, range: "90–100", label: t("ip.profile.high") },
];

export function IpReputationScale({
  profile,
}: {
  profile: ReturnType<typeof ipProfile>;
}) {
  const { resolvedTheme } = useTheme();
  const graph = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = graph.current;
    if (!element) return;
    const dark = resolvedTheme === "dark" || profile.score === 100;
    const accent = dark ? "#f3ecdf" : "#20252c";
    const spectrum = ["#cd3832", "#ed8557", "#edc647", "#64c582", "#249139"];
    const muted = dark ? "#b6ad9c" : "#64748b";
    const chart = init(element, null, { renderer: "svg" });
    const draw = () => {
      chart.resize();
      const width = element.clientWidth;
      if (!width) return;
      const option: ComposeOption<
        | BarSeriesOption
        | ScatterSeriesOption
        | GridComponentOption
        | GraphicComponentOption
      > = {
        animation: !window.matchMedia("(prefers-reduced-motion: reduce)")
          .matches,
        animationDuration: 650,
        animationDurationUpdate: 260,
        animationEasing: "cubicOut",
        animationEasingUpdate: "cubicOut",
        grid: { left: 4, right: 4, top: 7, bottom: 22 },
        xAxis: { type: "value", min: 0, max: 100, show: false },
        yAxis: { type: "category", data: ["score"], show: false },
        graphic: [0, 25, 50, 75, 100].map((value) => ({
          type: "text",
          x: 4 + ((width - 8) * value) / 100,
          y: element.clientHeight - 10,
          style: {
            text:
              value === 0
                ? t("ip.profile.0Low")
                : value === 100
                  ? t("ip.profile.100High")
                  : String(value),
            fill: muted,
            fontSize: 10,
            align: value === 0 ? "left" : value === 100 ? "right" : "center",
            verticalAlign: "middle",
          },
        })),
        series: [
          ...bands.map((_band, index): BarSeriesOption => ({
            type: "bar",
            stack: "reputation",
            data: [25],
            barWidth: 10,
            silent: true,
            itemStyle: {
              color: new graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: spectrum[index] },
                { offset: 1, color: spectrum[index + 1] },
              ]),
              borderRadius:
                index === 0 ? [4, 0, 0, 4] : index === 3 ? [0, 4, 4, 0] : 0,
            },
          })),
          {
            type: "scatter",
            data: profile.score === null ? [] : [[profile.score, "score"]],
            symbol: "rect",
            symbolSize: [4, 20],
            z: 5,
            silent: true,
            itemStyle: {
              color: accent,
              opacity: 1,
              borderColor: dark ? "#191d24" : "#fff",
              borderWidth: 1,
            },
            label: {
              show: false,
              position: "top",
              distance: 4,
              formatter: () => `${profile.score}`,
              color: accent,
              fontSize: 13,
              fontWeight: 700,
              align:
                (profile.score ?? 0) >= 90
                  ? "right"
                  : (profile.score ?? 0) <= 10
                    ? "left"
                    : "center",
            },
          },
        ],
      };
      chart.setOption(option);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(element);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [profile, resolvedTheme]);
  return (
    <div
      ref={graph}
      className={reputationScaleClass}
      role="img"
      aria-label={
        profile.score === null
          ? t("ip.profile.reputationScoreUnknown")
          : t("ip.profile.reputation100InTheBand", [
              profile.score,
              bands[profile.scoreBand!].label,
            ])
      }
    />
  );
}

export default function IpProfileGraph({
  data,
  profile,
  inbound,
}: {
  inbound: ReturnType<typeof useIpLatency>;
  data: CoffeeIp;
  profile: ReturnType<typeof ipProfile>;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const fieldsRef = useRef<HTMLDListElement>(null);
  const fields = ipProfileFields(data, profile);
  const active = selected === null ? null : fields[selected];
  useLayoutEffect(() => {
    const list = fieldsRef.current;
    if (!list) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const items = list.querySelectorAll(":scope > div");
      const tween = gsap.fromTo(
        items,
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          stagger: 0.045,
          ease: "power2.out",
          clearProps: "opacity,transform",
        },
      );
      return () => tween.kill();
    });
    return () => media.revert();
  }, [data.ip]);
  return (
    <>
      <ToolCard title={t("common.ipProfile")}>
        <dl
          ref={fieldsRef}
          className="grid grid-cols-2 gap-2 max-md:gap-x-3 max-md:gap-y-0 lg:grid-cols-4"
        >
          {fields.map((field, index) => (
            <div
              key={field.label}
              className="flex min-w-0 flex-col items-start gap-0.5 rounded-[10px] bg-muted/60 px-3 py-2 text-[12px] max-md:gap-0 max-md:rounded-none max-md:border-b max-md:border-border max-md:bg-transparent max-md:px-0 max-md:py-[3px] max-md:[&:nth-last-child(-n+2)]:border-b-0"
            >
              <dt className="flex items-center gap-1 text-muted-foreground">
                <span>{field.label}</span>
                <button
                  type="button"
                  className="grid size-7 flex-none cursor-pointer place-items-center rounded-[5px] hover:bg-muted hover:text-primary focus-visible:bg-muted focus-visible:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                  aria-label={t("common.explain", [field.label])}
                  onClick={() => setSelected(index)}
                >
                  <Info size={14} aria-hidden="true" />
                </button>
              </dt>
              <dd className="flex min-w-0 flex-wrap items-center gap-1 text-left font-medium wrap-anywhere max-md:text-[12px]">
                <Badge variant={field.tone ?? "info"}>{field.value}</Badge>
                {field.special && (
                  <Badge variant="outline">
                    {t("ip.profile.specialCategory")}
                  </Badge>
                )}
              </dd>
            </div>
          ))}
        </dl>
        <ResponsiveDialog
          open={active !== null}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          title={active?.label ?? ""}
          description={t(
            "ip.profile.exploreCategoriesAndThisIpSClassification",
          )}
        >
          {active && (
            <>
              <div className="rounded-[8px] bg-primary/10 p-3 text-[12px]">
                <span className="mr-2 text-muted-foreground">
                  {t("ip.profile.currentIp")}
                </span>
                <strong className="text-primary">{active.value}</strong>
                {active.detail && (
                  <p className="mt-[5px] leading-[1.6] wrap-anywhere">
                    {active.detail}
                  </p>
                )}
              </div>
              <dl className="grid gap-2">
                {active.options.map((option) => (
                  <div
                    key={option.label}
                    data-current={option.current || undefined}
                    className="rounded-[8px] border border-transparent bg-muted p-2.5 data-current:border-primary"
                  >
                    <dt className="flex items-center justify-between gap-2 text-[12px]">
                      <strong>{option.label}</strong>
                      {option.status ? (
                        <span className={catalogTagClass}>{option.status}</span>
                      ) : (
                        option.current && (
                          <span className={catalogTagClass}>
                            {t("ip.profile.currentCategory")}
                          </span>
                        )
                      )}
                    </dt>
                    <dd className="mt-1 text-[12px] leading-[1.7] text-muted-foreground">
                      {option.description}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </ResponsiveDialog>
      </ToolCard>
      <ScenarioPanel ip={data.ip} inbound={inbound} />
    </>
  );
}
