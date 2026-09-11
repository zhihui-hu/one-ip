import { useLayoutEffect, useRef, useState } from "react";
import { NumberTicker } from "@/components/number-ticker";
import { ActionButton } from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { t } from "@/i18n";
import { hideIpAtom } from "@/store/privacy";
import { useQueries } from "@tanstack/react-query";
import { gsap } from "gsap";
import { useAtomValue } from "jotai";
import { detectSignal, summarizeSignals } from "./score";
import { SIGNALS } from "../../../vendor/claude-environment/signals";

const labels = [
  "系统时区",
  "浏览器语言",
  "已安装中文字体",
  "厂商及软件字体",
  "WebRTC 地址暴露",
  "浏览器 / WebView 标记",
  "设备厂商标记",
  "日期格式区域",
  "时区偏移",
  "Emoji 渲染风格",
];

export function EnvironmentScore() {
  const content = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const hidden = useAtomValue(hideIpAtom);
  const queries = useQueries({
    queries: SIGNALS.map((definition) => ({
      queryKey: ["claude-upstream-signal", definition.id],
      queryFn: () => detectSignal(definition),
      retry: false,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    })),
  });
  const busy = queries.some((query) => query.isFetching);
  const result = summarizeSignals(
    queries.map((query) =>
      query.isFetching || query.isError ? undefined : query.data,
    ),
  );
  const completed = queries.filter(
    (query) => !query.isFetching && !query.isPending,
  ).length;
  useLayoutEffect(() => {
    if (!content.current) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        gsap.fromTo(
          "[data-scan-enter]",
          { autoAlpha: 0, y: 6 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.3,
            stagger: 0.035,
            ease: "power2.out",
            clearProps: "opacity,visibility,transform",
          },
        );
      }, content);
      return () => context.revert();
    });
    return () => media.revert();
  }, [busy]);
  const hits = SIGNALS.flatMap((definition, i) =>
    !queries[i].isFetching &&
    !queries[i].isError &&
    (queries[i].data?.score ?? 0) >= 0.25
      ? [
          {
            definition,
            i,
            points:
              Math.round(queries[i].data!.score * definition.weight * 10) / 10,
          },
        ]
      : [],
  );
  const band = { low: t("低风险"), medium: t("中风险"), high: t("高风险") }[
    result.band
  ];
  const color = {
    low: "text-emerald-600",
    medium: "text-amber-600",
    high: "text-destructive",
  }[result.band];
  const recommendations = [
    ...(hits.some(
      ({ definition }) =>
        definition.id === "timezone" ||
        definition.id === "timezoneOffset" ||
        definition.id === "language" ||
        definition.id === "intlLocale",
    )
      ? [t("核对系统时区、浏览器语言和区域格式是否符合实际使用环境。")]
      : []),
    ...(hits.some(({ definition }) => definition.id === "webrtcLeak")
      ? [
          t(
            "检测到 ICE 地址候选，请在 WebRTC 页面核对公网地址及 UDP 路由；候选地址不一定代表泄露。",
          ),
        ]
      : []),
    ...(hits.some(({ definition }) =>
      ["fonts", "vendorFonts", "cnBrowser", "deviceVendor", "emoji"].includes(
        definition.id,
      ),
    )
      ? [
          t(
            "字体、设备和 Emoji 属于弱环境线索，正常系统也可能命中，不建议仅为降低分数修改或删除它们。",
          ),
        ]
      : []),
    ...(!result.complete
      ? [
          t(
            "部分检测未完成，请查看日志定位失败项，检查网络或浏览器限制后重试。",
          ),
        ]
      : []),
    t(
      "结合上方网络卡片确认连通情况；这些环境信号不能确定 Claude 如何识别用户，也不能预测账号状态。",
    ),
  ];
  function renderLogs() {
    return (
      <div
        role="log"
        aria-label={t("检测日志")}
        aria-live="polite"
        className="max-h-72 overflow-auto font-mono text-xs leading-6"
      >
        {SIGNALS.map((definition, i) => {
          const query = queries[i];
          const pending = query.isFetching || query.isPending;
          const unavailable =
            !pending &&
            (query.isError ||
              /unknown|unavailable/i.test(query.data?.raw ?? "unknown"));
          return (
            <div
              key={definition.id}
              className="flex items-start gap-2 border-b border-border/40 py-1 last:border-0"
            >
              <span className="shrink-0 text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={
                  pending
                    ? "shrink-0 text-muted-foreground"
                    : unavailable
                      ? "shrink-0 text-amber-600"
                      : "shrink-0 text-emerald-600"
                }
              >
                [{pending ? t("检测中") : unavailable ? t("未完成") : t("完成")}
                ]
              </span>
              <div className="min-w-0 flex-1 break-words">
                <span>{t(labels[i])}</span>
                <span className="text-muted-foreground">
                  {" "}
                  ·{" "}
                  {pending
                    ? t("等待结果…")
                    : query.isError
                      ? t("检测失败或超时")
                      : definition.id === "webrtcLeak" && hidden
                        ? t("IP 已隐藏")
                        : query.data?.raw}
                </span>
              </div>
              {!pending && !unavailable && (
                <span className="shrink-0 tabular-nums">
                  +
                  {Math.round(
                    (query.data?.score ?? 0) * definition.weight * 10,
                  ) / 10}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{t("Claude 中国用户检测")}</CardTitle>
          <ActionButton
            size="sm"
            variant="ghost"
            busy={busy}
            onClick={() => queries.forEach((query) => void query.refetch())}
          >
            {busy ? t("检测中…") : t("重新检测")}
          </ActionButton>
        </div>
      </CardHeader>
      <CardContent ref={content} className="space-y-3">
        <div
          className="grid gap-5 py-2 md:grid-cols-[220px_minmax(0,1fr)]"
          aria-live="polite"
        >
          <div className="space-y-2 md:border-r md:pr-5">
            <div className="flex items-baseline gap-3">
              <div className={`text-4xl font-medium tabular-nums ${color}`}>
                <NumberTicker value={result.total} />
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  / 100
                </span>
              </div>
              <span className={`text-sm font-medium ${color}`}>
                {busy ? t("检测中…") : result.complete ? band : t("检测不完整")}
              </span>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              {busy
                ? t("正在检测环境特征…")
                : result.complete
                  ? t("环境信号评分，非 Claude 官方判定")
                  : t("当前分数仅包含已完成项目，不作完整风险分档。")}
            </p>
          </div>
          <div
            data-scan-enter
            className="grid content-center gap-x-8 gap-y-2 sm:grid-cols-2"
          >
            {hits.map(({ definition, i, points }) => (
              <div
                key={definition.id}
                className="flex min-w-0 items-center justify-between gap-3 border-b border-border/50 py-2 text-sm"
              >
                <span className="text-muted-foreground">{t(labels[i])}</span>
                <span className="shrink-0 font-medium tabular-nums">
                  +{points}
                </span>
              </div>
            ))}
            {!busy && !hits.length && (
              <span className="text-sm text-muted-foreground">
                {t("本次无命中信号")}
              </span>
            )}
            {busy && (
              <p
                className="col-span-full text-xs text-muted-foreground"
                role="status"
              >
                {t("检测进度：{0}/{1}", [completed, SIGNALS.length])}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <details className="min-w-0 flex-1 text-sm">
            <summary className="w-fit cursor-pointer text-muted-foreground hover:text-foreground">
              {t("建议与检测说明")}
            </summary>
            <div className="mt-3 space-y-3 pr-3 text-xs leading-6 text-muted-foreground">
              {!busy && (
                <ul className="list-disc space-y-1 pl-4">
                  {recommendations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              <p>
                {t(
                  "采用开源项目的 10 项检测与原始权重。分数为项目启发式规则，不是 Claude 官方判定或封禁概率；Emoji 项使用 UA 推测。",
                )}
              </p>
              <a
                href="https://github.com/LinXiaoTao/FuckClaude"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                {t("检测源码：FuckClaude（MIT）")}
              </a>
            </div>
          </details>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 self-start text-muted-foreground"
            onClick={() => setOpen(true)}
          >
            {t("查看检测日志")}
          </Button>
        </div>
        <ResponsiveDialog
          open={open}
          onOpenChange={setOpen}
          title={t("检测日志")}
          description={t("本次检测结果与各项环境信号详情。")}
        >
          {renderLogs()}
        </ResponsiveDialog>
      </CardContent>
    </Card>
  );
}
