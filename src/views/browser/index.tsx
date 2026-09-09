import { useEffect, useRef, useState } from "react";
import { CompactText } from "@/components/compact-text";
import {
  DataTable,
  Facts,
  ToolCard,
  PageHeading,
  ErrorNotice,
  Pending,
} from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { UnderlineHover } from "@/components/underline-hover";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
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
import { withDetectionAnimation } from "./with-feedback";

const columns: ColumnDef<Check>[] = [
  { accessorKey: "name", header: "项目" },
  { accessorKey: "status", header: "结果" },
  {
    accessorKey: "detail",
    header: "说明",
    cell: ({ row }) => <CompactText text={row.original.detail} />,
  },
];
const titles: Record<string, string> = {
  environment: "环境信息",
  fingerprint: "指纹检测",
  consistency: "环境一致性",
  automation: "自动化特征",
  privacy: "权限与隐私",
};
function FingerprintPanel() {
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
          setError(new Error("指纹检测未完成，请检查浏览器限制后重试。"));
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
      const next = await withDetectionAnimation(fingerprint);
      setPrevious(result);
      setResult(next);
      toast.success("指纹检测完成");
    } catch {
      toast.error("指纹检测失败，请重试");
      setError(new Error("指纹检测未完成，请检查浏览器限制后重试。"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <ToolCard title="浏览器指纹">
        <div className="row-between gap-3">
          <p className="small muted">在本地计算，仅比较当前页面内的结果。</p>
          <Button disabled={busy} onClick={run}>
            {busy ? (
              <Pending>检测中…</Pending>
            ) : result ? (
              "再次检测"
            ) : (
              "开始检测"
            )}
          </Button>
        </div>
        <ErrorNotice error={error} />
        {result && (
          <Facts
            rows={[
              ["FingerprintJS 版本", result.version],
              ["Visitor ID", result.visitorId],
              [
                "与上次比较",
                previous
                  ? previous.visitorId === result.visitorId
                    ? "相同"
                    : "发生变化"
                  : "尚无上次结果",
              ],
            ]}
          />
        )}
        <p className="small muted mt-2">
          标识相同不代表同一设备；指纹不是验证码，也没有“通过”结论。
        </p>
      </ToolCard>
      {result && (
        <div className="mt-3">
          <ToolCard title="指纹组成">
            <DataTable
              className="fingerprint-table"
              getRowId={(row) => row.name}
              data={result.components.filter((component) =>
                hasResultValue(parseDetail(component.detail)),
              )}
              columns={[
                {
                  accessorKey: "name",
                  header: "项目",
                  cell: ({ row }) => (
                    <UnderlineHover asChild>
                      <button
                        type="button"
                        className="max-w-full truncate text-left text-primary focus-visible:outline-ring"
                        onClick={() => setDetail(row.original)}
                        aria-label={`查看 ${row.original.name} 详情`}
                      >
                        {fieldLabel(row.original.name)}
                      </button>
                    </UnderlineHover>
                  ),
                },
                {
                  accessorKey: "value",
                  header: "检测数据",
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
                  header: "与上次比较",
                  cell: ({ row }) => {
                    const before = previous?.components.find(
                      (item) => item.name === row.original.name,
                    );
                    return before
                      ? before.value === row.original.value
                        ? "相同"
                        : "变化"
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
        title={`${detail ? fieldLabel(detail.name) : "指纹"} · 详情`}
        description="本次检测读取的指纹组成数据。"
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
                toast.success(`${titles[page]}检测完成`);
              } catch {
                toast.error("检测失败，请重试");
              } finally {
                setRefreshing(false);
              }
            }}
          >
            {query.isFetching || refreshing ? (
              <Pending>检测中…</Pending>
            ) : (
              "重新检测"
            )}
          </Button>
        </div>
      }
    >
      <ErrorNotice error={query.error} />
      <DataTable
        data={query.data ?? []}
        columns={columns}
        empty={query.isFetching ? <Pending>检测中…</Pending> : "暂无结果"}
      />
      <p className="small muted mt-3">
        仅展示可观察到的信号，不能据此判断浏览器品牌、真人身份或验证码通过率。
      </p>
    </ToolCard>
  );
}
export default function BrowserPage({ page }: { page: string }) {
  return (
    <div className="browser-diagnostics">
      <PageHeading title={titles[page]} description="" />
      {page === "environment" ? (
        <ToolCard title="浏览器环境">
          <Facts
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
        <>
          <Checks page={page} />
          {page === "consistency" && <DeepPanel />}
        </>
      )}
    </div>
  );
}
