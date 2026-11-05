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
import type { Geo } from "@/lib/types";
import type { Site } from "./api";
import { categoryStatusClass, matchesSiteCategory } from "./category-status";
import { siteCategories } from "./site-categories";

const ExitMap = lazy(() => import("./exit-map"));
type Row = Site & {
  geo?: Geo;
  visible: boolean;
  pending: boolean;
  reachable?: boolean;
  geoPending: boolean;
};

export type SiteFilter = {
  kind: "site" | "ip";
  value: string;
};

export function ExitGroups({
  rows,
  category,
  onCategoryChange,
  onSelect,
  onFilter,
  activeFilter,
}: {
  rows: Row[];
  category: string;
  onCategoryChange: (category: string) => void;
  onSelect: (name: string) => void;
  onFilter: (filter: SiteFilter) => void;
  activeFilter: SiteFilter | null;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = rows.filter((row) => matchesSiteCategory(row, category));
  const groups = new Map<string, Row[]>();
  for (const row of filtered) {
    const key =
      !row.visible || row.pending
        ? "pending"
        : row.reachable === false
          ? "unreachable"
          : (row.geo?.ip ?? "egress-unreadable");
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const priority = (key: string) =>
    key === "unreachable"
      ? 0
      : key === "egress-unreadable"
        ? 1
        : key === "pending"
          ? 2
          : 3;
  const selectGroup = (key: string) => {
    setSelected(key);
    if (
      key !== "unreachable" &&
      key !== "egress-unreadable" &&
      key !== "pending"
    )
      onFilter({ kind: "ip", value: key });
  };
  return (
    <>
      <Card className="mb-3 gap-0 rounded-lg py-0 shadow-none">
        <CardContent className="flex min-w-0 items-center gap-2 p-2">
          <div
            role="group"
            aria-label={t("home.siteCategory")}
            className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none]"
          >
            {siteCategories.map(([value, label]) => {
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
                    onCategoryChange(value);
                    setSelected(null);
                  }}
                >
                  {label} (
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
                  <Pending>{t("home.loadingMap")}</Pending>
                </div>
              }
            >
              <ExitMap
                rows={filtered}
                onSelect={(name) => {
                  onSelect(name);
                  onFilter({ kind: "site", value: name });
                }}
                mapOnly
              />
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
                  key === "unreachable" ||
                  key === "egress-unreadable" ||
                  key === "pending";
                return (
                  <Card
                    key={key}
                    className={`gap-0 rounded-lg border py-0 shadow-none transition-colors hover:border-primary/25 ${activeFilter?.kind === "ip" && activeFilter.value === key ? "border-primary ring-1 ring-primary/20" : ""}`}
                  >
                    <CardContent className="space-y-1.5 p-3">
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <button
                          type="button"
                          className="min-w-0 flex-1 overflow-hidden text-left whitespace-nowrap text-sm font-medium hover:text-primary"
                          onClick={() => selectGroup(key)}
                          aria-pressed={
                            activeFilter?.kind === "ip" &&
                            activeFilter.value === key
                          }
                        >
                          {special ? (
                            <span
                              className={
                                key === "unreachable"
                                  ? "text-destructive"
                                  : key === "egress-unreadable"
                                    ? "text-warning"
                                    : "text-muted-foreground"
                              }
                            >
                              {t(
                                key === "unreachable"
                                  ? "home.websiteAccessBlocked"
                                  : key === "egress-unreadable"
                                    ? "home.egressUnavailable"
                                    : "common.checking",
                              )}
                            </span>
                          ) : (
                            <IpText ip={key} link={false} />
                          )}
                        </button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-6 shrink-0 rounded-full px-2 text-[11px]"
                          onClick={(event) => {
                            event.stopPropagation();
                            selectGroup(key);
                          }}
                        >
                          {items.length} {t("home.sites")} ›
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
                                  .join(" · ") ||
                                t("common.locationDetailsAreUnavailable")
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
        title={t("home.egressSite")}
        description=""
      >
        {selected === "unreachable" && (
          <p className="mb-2 text-sm text-destructive">
            {t("home.websiteAccessBlockedLabel")}
          </p>
        )}
        {selected === "egress-unreadable" && (
          <p className="mb-2 text-sm text-warning">
            {t("home.websiteReachableButEgressIpWasNotReadable")}
          </p>
        )}
        {selected &&
          !["unreachable", "egress-unreadable", "pending"].includes(
            selected,
          ) && <IpText ip={selected} />}
        <div className="flex flex-wrap gap-2">
          {(groups.get(selected ?? "") ?? []).map((row) => {
            const host =
              row.domain ?? row.icon.match(/\/ip3\/([^/?#]+)\.ico/)?.[1];
            const url = row.domain
              ? `https://${row.domain}`
              : (row.url ?? `https://${host ?? row.name}`);
            return (
              <Badge
                key={row.name}
                asChild
                variant="secondary"
                className={`h-8 max-w-full gap-1.5 px-2.5 ${selected === "unreachable" ? "bg-destructive/10 text-destructive" : selected === "egress-unreadable" ? "bg-warning/10 text-warning" : ""}`}
              >
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={url}
                  onClick={() => onFilter({ kind: "site", value: row.name })}
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
