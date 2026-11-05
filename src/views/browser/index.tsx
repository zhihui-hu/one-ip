import { useEffect, useRef, useState } from "react";
import { CompactText } from "@/components/compact-text";
import { DataTable } from "@/components/data-table";
import {
  Facts,
  ToolCard,
  PageHeading,
  ErrorNotice,
  Pending,
} from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { UnderlineHover } from "@/components/underline-hover";
import { t } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { consistencyChecks, automationChecks, fingerprint } from "./collect";
import type { Check } from "./consistency";
import { DeepPanel } from "./deep-panel";
import { environmentRows } from "./environment";
import { FormattedResult } from "./formatted-result";
import Privacy from "./privacy";
import {
  fieldLabel,
  fingerprintSummary,
  parseDetail,
  hasResultValue,
} from "./result-format";
import { TlsFingerprint } from "./tls-fingerprint";
import { withDetectionAnimation } from "./with-feedback";

const checkStatusLabels: Record<Check["status"], string> = {
  consistent: t("browser.check.consistent"),
  different: t("browser.check.different"),
  detected: t("browser.check.detected"),
  "not-detected": t("browser.check.notDetected"),
  unavailable: t("browser.check.unavailable"),
};

const columns: ColumnDef<Check>[] = [
  { accessorKey: "name", header: t("common.item") },
  {
    accessorKey: "status",
    header: t("common.result"),
    cell: ({ row }) => checkStatusLabels[row.original.status],
  },
  {
    accessorKey: "detail",
    header: t("common.description"),
    cell: ({ row }) => <CompactText text={row.original.detail} />,
  },
];
const titles: Record<string, string> = {
  environment: t("common.environment"),
  fingerprint: t("common.fingerprint"),
  checks: t("common.environmentChecks"),
  consistency: t("common.consistency"),
  automation: t("common.automation"),
  privacy: t("common.permissionsPrivacy"),
};
function FingerprintPanel() {
  const [algorithm, setAlgorithm] = useState<"modern" | "tls">("modern");
  return (
    <>
      <div className="mb-3 flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              {t("browser.algorithm")}：
              {algorithm === "modern" ? "FingerprintJS (5.3.0)" : "JA3/JA4"}
              <ChevronDown aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              value={algorithm}
              onValueChange={(value) => {
                if (value === "modern" || value === "tls") setAlgorithm(value);
              }}
            >
              <DropdownMenuRadioItem value="modern">
                FingerprintJS (5.3.0)
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="tls">
                JA3/JA4 Fingerprint
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {algorithm === "tls" ? <TlsFingerprint /> : <FingerprintResults />}
    </>
  );
}
function FingerprintResults() {
  const [result, setResult] =
    useState<Awaited<ReturnType<typeof fingerprint>>>();
  const [previous, setPrevious] = useState<typeof result>();
  const [detail, setDetail] = useState<
    Awaited<ReturnType<typeof fingerprint>>["components"][number] | null
  >(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<Error>();
  const initialRun = useRef<ReturnType<typeof fingerprint> | null>(null);
  useEffect(() => {
    let active = true;
    initialRun.current ??= fingerprint();
    void initialRun.current.then(
      (next) => {
        if (active) {
          setResult(next);
          setBusy(false);
        }
      },
      () => {
        if (active) {
          setError(
            new Error(
              t(
                "browser.fingerprintCheckDidFinishReviewBrowserRestrictionsRetry",
              ),
            ),
          );
          setBusy(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, []);
  async function run() {
    setBusy(true);
    setError(undefined);
    try {
      const next = await withDetectionAnimation(() => fingerprint());
      setPrevious(result);
      setResult(next);
      toast.success(t("browser.fingerprintCheckComplete"));
    } catch {
      toast.error(t("browser.fingerprintCheckFailedPleaseRetry"));
      setError(
        new Error(
          t("browser.fingerprintCheckDidFinishReviewBrowserRestrictionsRetry"),
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <ToolCard title={t("common.browserFingerprint")}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.78rem] text-muted-foreground">
            {t("browser.calculatedLocallyComparesResultsWithinCurrentPage")}
          </p>
          <Button disabled={busy} onClick={run}>
            {busy ? (
              <Pending>{t("common.checking")}</Pending>
            ) : result ? (
              t("browser.checkAgain")
            ) : (
              t("browser.startCheck")
            )}
          </Button>
        </div>
        <ErrorNotice error={error} />
        {result && (
          <Facts
            valueClassName="max-w-[70%]"
            rows={[
              [t("browser.fingerprintjsVersion"), result.version],
              ["Visitor ID", result.visitorId],
              [
                t("browser.comparedWithPreviousResult"),
                previous
                  ? previous.visitorId === result.visitorId
                    ? t("browser.same")
                    : t("browser.changed")
                  : t("browser.noPreviousResult"),
              ],
            ]}
          />
        )}
        <p className="mt-2 text-[0.78rem] text-muted-foreground">
          {t("browser.matchingIdentifiersDoProveSameDeviceFingerprintCaptcha")}
        </p>
      </ToolCard>
      {result && (
        <div className="mt-3">
          <ToolCard title={t("browser.fingerprintComponents")}>
            <DataTable
              className="[&_td]:py-2! [&_td]:whitespace-nowrap! [&_td:nth-child(2)]:text-[0.8rem] [&_th:first-child]:w-[30%] [&_th:last-child]:w-[20%] [&_th:nth-child(2)]:w-[50%] max-sm:[&_td]:px-2! max-sm:[&_th]:px-2! max-sm:[&_th:first-child]:w-[35%] max-sm:[&_th:last-child]:w-[25%] max-sm:[&_th:nth-child(2)]:w-[40%]"
              getRowId={(row) => row.name}
              data={result.components.filter((component) =>
                hasResultValue(parseDetail(component.detail)),
              )}
              columns={[
                {
                  accessorKey: "name",
                  header: t("common.item"),
                  cell: ({ row }) => (
                    <UnderlineHover asChild>
                      <button
                        type="button"
                        className="max-w-full truncate text-left text-primary focus-visible:outline-ring"
                        onClick={() => setDetail(row.original)}
                        aria-label={t("common.viewDetails", [
                          row.original.name,
                        ])}
                      >
                        {fieldLabel(row.original.name)}
                      </button>
                    </UnderlineHover>
                  ),
                },
                {
                  accessorKey: "value",
                  header: t("browser.diagnosticData"),
                  cell: ({ row }) => (
                    <CompactText
                      text={fingerprintSummary(
                        row.original.name,
                        parseDetail(row.original.detail),
                      )}
                    />
                  ),
                },
                {
                  id: "change",
                  header: t("browser.comparedWithPreviousResult"),
                  cell: ({ row }) => {
                    const before = previous?.components.find(
                      (item) => item.name === row.original.name,
                    );
                    return before
                      ? before.value === row.original.value
                        ? t("browser.same")
                        : t("browser.change")
                      : "—";
                  },
                },
              ]}
            />
          </ToolCard>
        </div>
      )}
      <ResponsiveDialog
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        title={t("common.namedDetails", [
          detail ? fieldLabel(detail.name) : t("browser.fingerprint"),
        ])}
        description={t("browser.fingerprintComponentDataCollectedByThisCheck")}
      >
        {detail && (
          <FormattedResult
            key={detail.name}
            value={parseDetail(detail.detail)}
            hash={detail.value}
          />
        )}
      </ResponsiveDialog>
    </>
  );
}
function Checks({ page }: { page: string }) {
  const [refreshing, setRefreshing] = useState(false);
  const query = useQuery({
    queryKey: ["browser-checks", page],
    queryFn: () =>
      page === "consistency"
        ? consistencyChecks()
        : Promise.resolve(automationChecks()),
    retry: false,
  });
  return (
    <ToolCard
      title={
        <div className="flex items-center justify-between gap-3">
          <span>{titles[page]}</span>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={query.isFetching || refreshing}
            onClick={async () => {
              setRefreshing(true);
              try {
                await withDetectionAnimation(() =>
                  query.refetch({ throwOnError: true }),
                );
                toast.success(t("browser.namedCheckComplete", [titles[page]]));
              } catch {
                toast.error(t("browser.checkFailedPleaseRetry"));
              } finally {
                setRefreshing(false);
              }
            }}
          >
            {query.isFetching || refreshing ? (
              <Pending>{t("common.checking")}</Pending>
            ) : (
              t("common.runAgain")
            )}
          </Button>
        </div>
      }
    >
      <ErrorNotice error={query.error} />
      <DataTable
        data={query.data ?? []}
        columns={columns}
        empty={
          query.isFetching ? (
            <Pending>{t("common.checking")}</Pending>
          ) : (
            t("common.noResults")
          )
        }
      />
      <p className="mt-3 text-[0.78rem] text-muted-foreground">
        {t("browser.observableSignalsShownTheyCannotDetermineBrowserBrand")}
      </p>
    </ToolCard>
  );
}
export default function BrowserPage({ page }: { page: string }) {
  return (
    // `.sweep-shine` (index.css) is unlayered, so the faster cycle needs `!`.
    <div className="[&_table]:table-fixed [&_.sweep-shine]:[animation-duration:1s]!">
      <PageHeading title={titles[page]} />
      {page === "environment" ? (
        <ToolCard title={t("common.browserEnvironment")}>
          <Facts
            valueClassName="max-w-[70%]"
            rows={environmentRows().map(([name, value]) => [
              name,
              typeof value === "string" ? (
                <CompactText key={name} text={value} />
              ) : (
                value
              ),
            ])}
          />
        </ToolCard>
      ) : page === "fingerprint" ? (
        <FingerprintPanel />
      ) : page === "privacy" ? (
        <Privacy />
      ) : (
        <div className="flex flex-col gap-3">
          <Checks page="consistency" />
          <DeepPanel />
          <Checks page="automation" />
        </div>
      )}
    </div>
  );
}
