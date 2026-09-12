import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CountryFlag } from "@/components/country-flag";
import { SiteLogo } from "@/components/site-logo";
import { IpText, Pending, ActionButton } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { UnderlineHover } from "@/components/underline-hover";
import { t } from "@/i18n";
import type { DiagnosticResult } from "@/lib/diagnostics";
import { queryKeys } from "@/lib/query-keys";
import type { Geo } from "@/lib/types";
import { useQueries } from "@tanstack/react-query";
import { detectSiteResult, getGeo } from "./api";
import { ExitGroups } from "./exit-groups";
import { sourceRegistry, type SourceDefinition } from "./source-registry";

const allSites = sourceRegistry.map((item) => ({
  ...item,
  name: t(item.name),
}));
const initialSites = allSites
  .filter(
    (site) => site.enabledByDefault && site.execution === "client-request",
  )
  .slice(0, 8);
const initialSiteIds = new Set(initialSites.map((site) => site.id));

function statusText(result: DiagnosticResult | undefined, note?: string) {
  if (!result)
    return t(note ?? "出口检测受阻（接口不支持、跨域限制或连接失败）");
  if (result.status === "ok") return t("已读取出口");
  if (result.status === "timeout")
    return t("检测超时，部分浏览器可能限制了检测接口。");
  if (result.status === "rate_limited") return t("外部数据源限流，请稍后重试");
  if (result.status === "cancelled") return t("检测已取消");
  return t(note ?? "出口检测受阻（接口不支持、跨域限制或连接失败）");
}

type Row = SourceDefinition & {
  visible: boolean;
  geo?: Geo;
  diagnostic?: DiagnosticResult;
  pending: boolean;
  geoPending: boolean;
};
export function SplitResults({ summary = false }: { summary?: boolean }) {
  const sites = summary ? initialSites : allSites;
  const [round, setRound] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailIp, setDetailIp] = useState<string | null>(null);
  const runId = `split-${round}`;
  const [visibleSites, setVisibleSites] = useState<Set<string>>(
    () => new Set(),
  );
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisibleSites(new Set(initialSiteIds));
        observer.disconnect();
      }
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [summary]);
  const queries = useQueries({
    queries: sites.map((site) => ({
      queryKey: queryKeys.home.split(site.id, round),
      enabled: visibleSites.has(site.id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        detectSiteResult(site, runId, signal),
      staleTime: 60_000,
      retry: false,
    })),
  });
  const ips = [
    ...new Set(
      [
        ...queries.filter((_, index) => visibleSites.has(sites[index].id)),
      ].flatMap((query) =>
        query.data?.status === "ok" && query.data.ip ? [query.data.ip] : [],
      ),
    ),
  ];
  const geoQueries = useQueries({
    queries: ips.map((ip) => ({
      queryKey: queryKeys.geo.byIp(ip),
      queryFn: ({ signal }: { signal: AbortSignal }) => getGeo(ip, signal),
      staleTime: 60_000,
      retry: false,
    })),
  });
  const geoByIp = new Map(ips.map((ip, index) => [ip, geoQueries[index]]));
  const rows: Row[] = sites.map((site, i) => ({
    ...site,
    visible: visibleSites.has(site.id),
    diagnostic: queries[i].data,
    geo:
      visibleSites.has(site.id) &&
      queries[i].data?.status === "ok" &&
      queries[i].data.ip
        ? {
            ip: queries[i].data.ip,
            source: site.name,
            ...geoByIp.get(queries[i].data.ip)?.data,
          }
        : undefined,
    pending:
      visibleSites.has(site.id) &&
      (queries[i].isFetching || queries[i].isPending),
    geoPending:
      visibleSites.has(site.id) &&
      (queries[i].isPending ||
        Boolean(
          queries[i].data?.status === "ok" &&
          queries[i].data.ip &&
          geoByIp.get(queries[i].data.ip)?.isPending,
        )),
  }));
  rows.sort((a, b) => {
    const aBlocked = a.visible && !a.pending && !a.geo;
    const bBlocked = b.visible && !b.pending && !b.geo;
    return Number(bBlocked) - Number(aBlocked);
  });
  const exits = [
    ...new Map(
      rows.flatMap((row) => (row.geo ? [[row.geo.ip, row.geo] as const] : [])),
    ).values(),
  ];
  const detail = rows.find((row) => row.id === detailId);
  const pending = queries.some((q) => q.isFetching);
  const Container = summary ? Card : "div";
  const Content = summary ? CardContent : "div";
  return (
    <Container ref={container} className="mb-3">
      {summary && (
        <CardHeader>
          <div className="row-between">
            <CardTitle>{t("网站分流出口")}</CardTitle>
            {summary && (
              <Link className="small muted" to="/network/exits">
                {t("查看全部 ›")}
              </Link>
            )}
          </div>
        </CardHeader>
      )}
      <Content>
        {!summary && (
          <div className="mb-3 flex justify-end">
            <ActionButton
              busy={pending}
              onClick={() => {
                setDetailId(null);
                setDetailIp(null);
                setVisibleSites(new Set(sites.map((site) => site.id)));
                setRound((value) => value + 1);
              }}
            >
              {pending
                ? t("检测中...")
                : visibleSites.size < sites.length
                  ? t("检测全部")
                  : t("重新检测")}
            </ActionButton>
          </div>
        )}
        {summary ? (
          <div className="grid grid-cols-1 items-start gap-x-4 gap-y-1 sm:grid-cols-2">
            {exits.map((geo) => (
              <div
                key={geo.ip}
                className="flex min-w-0 items-center gap-2 rounded-md bg-muted/30 px-2 py-1.5 text-xs"
              >
                <CountryFlag code={geo.country_code} />
                <span className="min-w-0 flex-1">
                  <IpText ip={geo.ip} />
                </span>
                <UnderlineHover asChild>
                  <button
                    type="button"
                    className="shrink-0 text-muted-foreground"
                    onClick={() => {
                      setDetailId(null);
                      setDetailIp(geo.ip);
                    }}
                  >
                    {rows.filter((row) => row.geo?.ip === geo.ip).length}
                    {t("个站点")}
                  </button>
                </UnderlineHover>
              </div>
            ))}
            <p className="home-note col-span-full pt-1">
              {pending ? (
                <Pending>{t("正在检测分流出口…")}</Pending>
              ) : (
                t("已读取 {0}/{1} 个站点的出口{2}", [
                  rows.filter((row) => row.geo).length,
                  sites.length,
                  !exits.length ? t("，暂无可显示结果") : "",
                ])
              )}
            </p>
          </div>
        ) : (
          <ExitGroups rows={rows} onSelect={setDetailId} />
        )}
      </Content>
      <ResponsiveDialog
        open={detailId !== null || detailIp !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailId(null);
            setDetailIp(null);
          }
        }}
        title={detail?.name ?? t("出口站点")}
        description={
          detail
            ? t("该站点观察到的出口信息。")
            : t("使用此出口的站点，点击名称查看详情。")
        }
      >
        {detail ? (
          <div className="space-y-3 text-sm">
            <p className="break-all text-muted-foreground">
              {detail.domain ?? detail.url ?? detail.name}
            </p>
            <div>
              {t("出口 IP：")}
              {detail.geo?.ip ? <IpText ip={detail.geo.ip} /> : t("检测受阻")}
            </div>
            <p>
              {[detail.geo?.country, detail.geo?.city, detail.geo?.isp]
                .filter(Boolean)
                .join(" · ") || t("归属信息暂不可用")}
            </p>
            <p className="text-muted-foreground">
              {detail.pending
                ? t("检测中…")
                : statusText(detail.diagnostic, detail.note)}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <IpText ip={detailIp ?? undefined} />
            <div className="flex flex-wrap gap-2">
              {rows
                .filter((row) => row.geo?.ip === detailIp)
                .map((row) => (
                  <Badge
                    key={row.id}
                    variant="secondary"
                    className="h-auto max-w-full gap-1.5 px-2.5 py-1.5 hover:bg-accent hover:text-accent-foreground [&_.site-icon]:size-3.5"
                    asChild
                  >
                    <button type="button" onClick={() => setDetailId(row.id)}>
                      <SiteLogo src={row.icon} />
                      <span className="min-w-0 truncate">{row.name}</span>
                    </button>
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </ResponsiveDialog>
    </Container>
  );
}
