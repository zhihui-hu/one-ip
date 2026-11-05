import { useCallback, useEffect, useRef, useState } from "react";
import { DataTable } from "@/components/data-table";
import { ErrorNotice, Facts, Pending, ToolCard } from "@/components/toolkit";
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
  const [busy, setBusy] = useState(true);
  const controller = useRef<AbortController | null>(null);
  const run = useCallback(async () => {
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
        toast.success(t("browser.deep.deepDiagnosticsComplete"));
      }
    } catch (error) {
      if (!active.signal.aborted) {
        setError(
          error instanceof Error
            ? error
            : new Error(t("browser.deep.checkFailed")),
        );
        toast.error(t("browser.deep.deepDiagnosticsFailedPleaseRetry"));
      }
    } finally {
      if (!active.signal.aborted) setBusy(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void run(), 0);
    return () => {
      clearTimeout(timer);
      controller.current?.abort();
    };
  }, [run]);
  const reports = result?.modules.map((module) => ({
    ...module,
    report: moduleReport(module.name, parseDetail(module.detail)),
  }));
  const flagged = reports?.filter((module) => module.report.signal) ?? [];
  const readErrors = reports?.find(
    (module) =>
      module.name === "errors" &&
      module.report.status === t("common.readErrorsFound"),
  );
  const unavailable =
    reports?.filter((module) => module.report.unavailable) ?? [];
  return (
    <div className="mt-3">
      <ToolCard title={t("browser.deep.deepBrowserDiagnostics")}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.78rem] text-muted-foreground">
            {t("browser.deep.basedOn")}{" "}
            <a
              href="https://github.com/abrahamjuliot/creepjs"
              target="_blank"
              rel="noreferrer"
            >
              {t("browser.deep.creepjsOpenSourceDiagnostics")}
            </a>
            {t("browser.deep.runLocallyByThisSite")}
          </p>
          <Button disabled={busy} onClick={run}>
            {busy ? (
              <Pending>{t("common.checking")}</Pending>
            ) : result ? (
              t("common.runAgain")
            ) : (
              t("browser.deep.startDeepDiagnostics")
            )}
          </Button>
        </div>
        <ErrorNotice error={error} />
        {result && (
          <>
            <div className="my-3 rounded-lg bg-muted/50 p-3" role="status">
              <p className="font-medium">
                {flagged.length
                  ? t("browser.deep.modulesWithSignals", [flagged.length])
                  : unavailable.length || readErrors
                    ? t(
                        "browser.deep.completedChecksFoundUnusualSignalsButResultsIncomplete",
                      )
                    : t("browser.deep.noUnusualSignalsFoundInThisCheck")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {flagged.length
                  ? flagged
                      .map((module) => fieldLabel(module.name))
                      .join("、") +
                    t(
                      "browser.deep.multipleModulesReportSameCauseTheseNecessarilyIndependent",
                    )
                  : t(
                      "browser.deep.conclusionCoversChecksPerformedProofBrowserAuthenticitySecurity",
                    )}
              </p>
              {readErrors && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {readErrors.report.summary}
                </p>
              )}
              {unavailable.length > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("browser.deep.unableToCheck")}
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
              valueClassName="max-w-[70%]"
              rows={[
                [t("browser.deep.sourceVersion"), result.commit.slice(0, 12)],
                [t("browser.deep.duration"), `${result.duration} ms`],
                [
                  t("browser.deep.modulesWithReturnedData"),
                  `${result.modules.filter((module) => module.status === t("common.complete")).length}/${result.modules.length}`,
                ],
              ]}
            />
            <DataTable
              className="[&_table]:table-fixed"
              data={reports ?? []}
              columns={[
                {
                  accessorKey: "name",
                  header: t("browser.deep.diagnosticModules"),
                  cell: ({ row }) => (
                    <UnderlineHover asChild>
                      <button
                        type="button"
                        className="max-w-full truncate text-left text-primary focus-visible:outline-ring"
                        aria-label={t(
                          "browser.deep.viewDeepDiagnosticDetails",
                          [row.original.name],
                        )}
                        onClick={() => setDetail(row.original)}
                      >
                        {fieldLabel(row.original.name)}
                      </button>
                    </UnderlineHover>
                  ),
                },
                {
                  id: "status",
                  header: t("browser.deep.diagnosticResults"),
                  cell: ({ row }) => row.original.report.status,
                },
                {
                  id: "summary",
                  header: t("browser.deep.aboutTheResults"),
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
        <p className="mt-3 text-[0.78rem] text-muted-foreground">
          {t("browser.deep.resultsComeSeparateSameOriginDiagnosticContextMay")}
        </p>
      </ToolCard>
      <ResponsiveDialog
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        title={t("common.namedDetails", [
          detail ? fieldLabel(detail.name) : t("browser.deep.deepDiagnostics"),
        ])}
        description={
          detail
            ? moduleReport(detail.name, parseDetail(detail.detail)).summary
            : t("browser.deep.resultsForThisCheck")
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
