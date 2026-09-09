import { useEffect, useRef, useState } from "react";
import {
  DataTable,
  ErrorNotice,
  Facts,
  Pending,
  ToolCard,
} from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { UnderlineHover } from "@/components/underline-hover";
import { t } from "@/i18n";
import { toast } from "sonner";
import {
  collectDeepDiagnostics,
  type DiagnosticModule,
  type DiagnosticResult,
} from "./deep-diagnostics";
import { FormattedResult } from "./formatted-result";
import { fieldLabel, moduleReport, parseDetail } from "./result-format";
import { withDetectionAnimation } from "./with-feedback";

export function DeepPanel() {
  const [result, setResult] = useState<DiagnosticResult>();
  const [detail, setDetail] = useState<DiagnosticModule | null>(null);
  const [error, setError] = useState<Error>();
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function run() {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setBusy(true);
    setError(undefined);
    setDetail(null);
    setResult(undefined);
    try {
      const next = await withDetectionAnimation(() =>
        collectDeepDiagnostics(active.signal),
      );
      if (!active.signal.aborted) {
        setResult(next);
        toast.success(t("深度检测完成"));
      }
    } catch (error) {
      if (!active.signal.aborted) {
        setError(error instanceof Error ? error : new Error(t("检测失败")));
        toast.error(t("深度检测失败，请重试"));
      }
    } finally {
      if (!active.signal.aborted) setBusy(false);
    }
  }
  const reports = result?.modules.map((module) => ({
    ...module,
    report: moduleReport(module.name, parseDetail(module.detail)),
  }));
  const flagged = reports?.filter((module) => module.report.signal) ?? [];
  const readErrors = reports?.find(
    (module) =>
      module.name === "errors" && module.report.status === t("存在读取错误"),
  );
  const unavailable =
    reports?.filter((module) => module.report.unavailable) ?? [];
  return (
    <div className="mt-3">
      <ToolCard title={t("浏览器深度检测")}>
        <div className="row-between gap-3">
          <p className="small muted">
            {t("基于")}{" "}
            <a
              href="https://github.com/abrahamjuliot/creepjs"
              target="_blank"
              rel="noreferrer"
            >
              {t("CreepJS 开源检测模块")}
            </a>
            {t("，由本站本地运行。")}
          </p>
          <Button disabled={busy} onClick={run}>
            {busy ? (
              <Pending>{t("检测中…")}</Pending>
            ) : result ? (
              t("重新检测")
            ) : (
              t("开始深度检测")
            )}
          </Button>
        </div>
        <ErrorNotice error={error} />
        {result && (
          <>
            <div className="my-3 rounded-lg bg-muted/50 p-3" role="status">
              <p className="font-medium">
                {flagged.length
                  ? t("{0} 个模块发现需要核对的信号", [flagged.length])
                  : unavailable.length || readErrors
                    ? t("已完成的检查未发现异常信号，但检测结果不完整")
                    : t("本次检测未发现异常信号")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {flagged.length
                  ? flagged
                      .map((module) => fieldLabel(module.name))
                      .join("、") +
                    t("。多个模块可能记录同一个原因，不代表存在多个独立问题。")
                  : t(
                      "此结论仅覆盖本次已执行的检查，不是浏览器真实性或安全性证明。",
                    )}
              </p>
              {readErrors && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {readErrors.report.summary}
                </p>
              )}
              {unavailable.length > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("无法检测：")}
                  {unavailable
                    .map((module) => fieldLabel(module.name))
                    .join("、")}
                </p>
              )}
              {flagged.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {flagged.map((module) => (
                    <li key={module.name}>
                      {fieldLabel(module.name)}：{module.report.summary}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Facts
              rows={[
                [t("源码版本"), result.commit.slice(0, 12)],
                [t("检测耗时"), `${result.duration} ms`],
                [
                  t("已返回数据的模块"),
                  `${result.modules.filter((module) => module.status === t("已完成")).length}/${result.modules.length}`,
                ],
              ]}
            />
            <DataTable
              data={reports ?? []}
              columns={[
                {
                  accessorKey: "name",
                  header: t("检测模块"),
                  cell: ({ row }) => (
                    <UnderlineHover asChild>
                      <button
                        type="button"
                        className="max-w-full truncate text-left text-primary focus-visible:outline-ring"
                        aria-label={t("查看 {0} 深度检测详情", [
                          row.original.name,
                        ])}
                        onClick={() => setDetail(row.original)}
                      >
                        {fieldLabel(row.original.name)}
                      </button>
                    </UnderlineHover>
                  ),
                },
                {
                  id: "status",
                  header: t("检测结果"),
                  cell: ({ row }) => row.original.report.status,
                },
                {
                  id: "summary",
                  header: t("结果说明"),
                  cell: ({ row }) => (
                    <span className="text-sm text-muted-foreground">
                      {row.original.report.summary}
                    </span>
                  ),
                },
              ]}
            />
          </>
        )}
        <p className="small muted mt-3">
          {t(
            "结果来自同源独立检测上下文，可能与主页面或官方站点不同。异常信号不能证明使用了指纹浏览器。未包含官方联网评分和 Worker 检测。",
          )}
        </p>
      </ToolCard>
      <ResponsiveDialog
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        title={t("{0} · 详情", [
          detail ? fieldLabel(detail.name) : t("深度检测"),
        ])}
        description={
          detail
            ? moduleReport(detail.name, parseDetail(detail.detail)).summary
            : t("本次检测结果")
        }
      >
        {detail && (
          <>
            {moduleReport(detail.name, parseDetail(detail.detail)).issues
              .length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {moduleReport(
                  detail.name,
                  parseDetail(detail.detail),
                ).issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
            <FormattedResult
              key={detail.name}
              value={parseDetail(detail.detail)}
            />
          </>
        )}
      </ResponsiveDialog>
    </div>
  );
}
