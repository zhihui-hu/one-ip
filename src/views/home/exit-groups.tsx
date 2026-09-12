import { lazy, Suspense, useState } from "react";
import { CompactText } from "@/components/compact-text";
import { CountryFlag } from "@/components/country-flag";
import { SiteLogo } from "@/components/site-logo";
import { IpText, Pending } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { t } from "@/i18n";
import type { SourceDefinition } from "@/lib/diagnostic-source";
import type { Geo } from "@/lib/types";
import { categoryStatusClass } from "./category-status";

const ExitMap = lazy(() => import("./exit-map"));
const categories = [
  ["all", "全部"],
  ["ai", "AI 服务"],
  ["crypto", "加密货币"],
  ["ecommerce", "跨境电商"],
  ["media", "流媒体"],
  ["social", "社交社区"],
  ["dev", "开发平台"],
  ["tools", "实用工具"],
  ["domestic", "国内"],
  ["static", "静态资源"],
  ["speed", "测速服务"],
];
type Row = SourceDefinition & {
  id: string;
  geo?: Geo;
  visible: boolean;
  pending: boolean;
  geoPending: boolean;
};

export function ExitGroups({
  rows,
  onSelect,
}: {
  rows: Row[];
  onSelect: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [category, setCategory] = useState("all");

  const filtered = rows.filter(
    (row) =>
      category === "all" ||
      (category === "domestic"
        ? row.type === "domestic"
        : row.extra?.includes(category)),
  );
  const groups = new Map<string, Row[]>();
  for (const row of filtered) {
    const key = !row.visible
      ? "idle"
      : row.pending
        ? "pending"
        : (row.geo?.ip ?? "blocked");
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const priority = (key: string) =>
    key === "blocked" ? 0 : key === "pending" ? 1 : key === "idle" ? 3 : 2;
  return (
    <>
      <Card className="mb-3 gap-0 rounded-lg py-0 shadow-none">
        <CardContent className="flex min-w-0 items-center gap-2 p-2">
          <div
            role="group"
            aria-label={t("站点分类")}
            className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none]"
          >
            {categories.map(([value, label]) => {
              const items = rows.filter(
                (row) =>
                  value === "all" ||
                  (value === "domestic"
                    ? row.type === "domestic"
                    : row.extra?.includes(value)),
              );
              return (
                <Button
                  key={value}
                  size="sm"
                  variant={category === value ? "secondary" : "ghost"}
                  className={`h-9 shrink-0 px-3 text-sm font-medium ${categoryStatusClass(items)}`}
                  aria-pressed={category === value}
                  onClick={() => {
                    setCategory(value);
                    setSelected(null);
                  }}
                >
                  {t(label)} (
                  {
                    items.filter(
                      (row) => row.visible && !row.pending && row.geo,
                    ).length
                  }
                  /{items.length})
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="min-w-0 gap-0 self-start rounded-lg py-0 shadow-none">
          <CardContent className="p-3">
            <Suspense
              fallback={
                <div className="h-[402px]">
                  <Pending>{t("加载地图…")}</Pending>
                </div>
              }
            >
              <ExitMap rows={filtered} onSelect={onSelect} mapOnly />
            </Suspense>
          </CardContent>
        </Card>
        <div className="h-[426px] min-w-0 overflow-auto pr-1">
          <div className="grid grid-cols-1 items-start gap-2">
            {[...groups]
              .sort(([a], [b]) => priority(a) - priority(b))
              .map(([key, items]) => {
                const geo =
                  items.find((row) => row.geo?.country)?.geo ?? items[0].geo;
                const special =
                  key === "blocked" || key === "pending" || key === "idle";
                return (
                  <Card
                    key={key}
                    className="gap-0 rounded-lg border py-0 shadow-none transition-colors hover:border-primary/25"
                  >
                    <CardContent className="space-y-1.5 p-3">
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-sm font-medium [&_.ip-text]:max-w-full [&_.ip-text]:min-w-0">
                          {special ? (
                            <span
                              className={
                                key === "blocked"
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                              }
                            >
                              {t(
                                key === "blocked"
                                  ? "检测受阻"
                                  : key === "idle"
                                    ? "待检测"
                                    : "检测中…",
                              )}
                            </span>
                          ) : (
                            <IpText ip={key} />
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-6 shrink-0 rounded-full px-2 text-[11px]"
                          onClick={() => setSelected(key)}
                        >
                          {items.length} {t("个站点")} ›
                        </Button>
                      </div>
                      {!special && (
                        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="shrink-0">
                            <CountryFlag code={geo?.country_code} />
                          </span>
                          <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap">
                            <CompactText
                              text={
                                [
                                  ...new Set([geo?.country, geo?.city]),
                                  geo?.isp,
                                  geo?.asn
                                    ? `AS${String(geo.asn).replace(/^AS/i, "")}`
                                    : undefined,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") || t("归属信息暂不可用")
                              }
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      </div>
      <ResponsiveDialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={t("出口站点")}
        description=""
      >
        {selected &&
          selected !== "blocked" &&
          selected !== "pending" &&
          selected !== "idle" && <IpText ip={selected} />}
        <div className="flex flex-wrap gap-2">
          {(groups.get(selected ?? "") ?? []).map((row) => {
            const host =
              row.domain ?? row.icon.match(/\/ip3\/([^/?#]+)\.ico/)?.[1];
            const url = row.domain
              ? `https://${row.domain}`
              : (row.url ?? `https://${host ?? row.name}`);
            return (
              <Badge
                key={row.id}
                asChild
                variant="secondary"
                className={`h-8 max-w-full gap-1.5 px-2.5 [&_.site-icon]:size-4 ${selected === "blocked" ? "bg-destructive/10 text-destructive" : ""}`}
              >
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={url}
                >
                  <SiteLogo src={row.icon} />
                  <span className="truncate">
                    {row.name.replace(/^www\./, "")}
                  </span>
                </a>
              </Badge>
            );
          })}
        </div>
      </ResponsiveDialog>
    </>
  );
}
