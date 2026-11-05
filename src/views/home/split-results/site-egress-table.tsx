import { useId, useLayoutEffect, useRef, useState } from "react";
import { CompactText } from "@/components/compact-text";
import { CountryFlag } from "@/components/country-flag";
import {
  dataTableCellClass,
  dataTableClass,
  dataTableHeadClass,
  dataTableTableClass,
} from "@/components/data-table";
import {
  SiteLogo,
  siteCellClass,
  siteCellIconClass,
} from "@/components/site-logo";
import { IpText, Pending } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/i18n";
import type { Geo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { type Site } from "../api";
import { type SiteFilter } from "../exit-groups";
import { siteCategoryLabels } from "../site-categories";

export interface Row extends Site {
  onDetail: (name: string) => void;
  visible: boolean;
  geo?: Geo;
  pending: boolean;
  reachable?: boolean;
  geoPending: boolean;
}

// Shared table cells; mobile turns each row into a two-column grid.
const cellClass = cn(
  dataTableCellClass,
  "whitespace-nowrap max-md:min-w-0 max-md:border-0 max-md:p-0 max-md:whitespace-normal",
);
const headClass = (width: string) => cn(dataTableHeadClass, width);
const badgeClass =
  "shrink-0 rounded-[10px] px-2 py-px text-[0.75em] leading-[calc(1/0.75)] max-xs:px-1 max-xs:text-[0.6rem]";
const metaClass = "text-[0.72rem] leading-[1.4] text-muted-foreground";

export function SiteEgressTable({
  rows,
  filter,
  onClearFilter,
}: {
  rows: Row[];
  filter: SiteFilter | null;
  onClearFilter: () => void;
}) {
  const tableId = useId();
  const [expanded, setExpanded] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const restoreToggle = useRef(false);
  const canToggle = rows.length > 5;
  const collapsed = canToggle && !expanded;
  const visibleRows = collapsed ? rows.slice(0, 6) : rows;
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const table = tableRef.current;
    const body = bodyRef.current;
    if (!viewport || !table || !body) return;
    const resize = () => {
      const preview = body.rows[5];
      viewport.style.height =
        collapsed && preview
          ? `${preview.getBoundingClientRect().top - table.getBoundingClientRect().top + 56}px`
          : "";
    };
    resize();
    if (restoreToggle.current) {
      restoreToggle.current = false;
      toggleRef.current?.scrollIntoView({
        block: "end",
        behavior: "instant",
      });
    }
    const observer = new ResizeObserver(resize);
    observer.observe(table);
    return () => observer.disconnect();
  }, [collapsed, rows.length]);
  return (
    <Card className="mb-3 gap-0 rounded-lg bg-card py-0">
      <CardHeader className="border-b-[1px] border-border bg-[color-mix(in_srgb,var(--muted)_42%,var(--card))] py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <CardTitle className="text-[1.1rem] font-bold leading-[1.35]">
                {t("home.websiteAccessDetails")}
              </CardTitle>
              <span className={metaClass}>
                {rows.length} {t("home.sites")}
              </span>
            </div>
            {filter && (
              <p
                className={`mt-[3px] max-w-full overflow-hidden text-ellipsis whitespace-nowrap ${metaClass}`}
              >
                {t(filter.kind === "site" ? "common.website" : "common.ip")} ·{" "}
                {filter.value}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {filter && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={onClearFilter}
              >
                {t("home.clearFilter")}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative p-0" data-collapsed={collapsed}>
        <div
          ref={viewportRef}
          className="relative overflow-hidden rounded-[8px]"
          data-expanded={expanded || !canToggle}
        >
          <div className={cn(dataTableClass, "bg-card")}>
            <table
              ref={tableRef}
              id={tableId}
              className={cn(
                dataTableTableClass,
                "min-w-[640px] table-fixed max-md:min-w-0",
              )}
            >
              <thead className="max-md:hidden">
                <tr>
                  <th className={headClass("w-[30%]")}>
                    {t("common.website")}
                  </th>
                  <th className={headClass("w-[20%]")}>
                    {t("home.accessStatus")}
                  </th>
                  <th className={headClass("w-[22%]")}>{t("common.ip")}</th>
                  <th className={headClass("w-[28%]")}>
                    {t("common.location")}
                  </th>
                </tr>
              </thead>
              <tbody ref={bodyRef} className="max-md:block">
                {visibleRows.map((row, index) => {
                  const location = row.geo
                    ? [
                        row.geo.country,
                        row.geo.region,
                        row.geo.city,
                        row.geo.isp,
                        row.geo.asn
                          ? `AS${String(row.geo.asn).replace(/^AS/i, "")}`
                          : undefined,
                      ]
                        .filter(Boolean)
                        .filter(
                          (value, index, all) => all.indexOf(value) === index,
                        )
                        .join(" · ")
                    : "";
                  const status = row.pending
                    ? t("common.checking")
                    : row.reachable === false
                      ? t("home.websiteAccessBlockedLabel")
                      : row.reachable === true
                        ? t("home.websiteReachable")
                        : t("home.waitingToCheck");
                  // Desktop draws row separators on cells; mobile moves them to the row.
                  const rowBorder =
                    index > 0 &&
                    "border-t border-t-[color-mix(in_srgb,var(--border)_58%,transparent)]";
                  return (
                    <tr
                      key={row.name}
                      inert={collapsed && index >= 5}
                      className="even:bg-muted hover:bg-accent max-md:grid max-md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] max-md:gap-x-3 max-md:gap-y-1.5 max-md:p-3 max-md:not-first:border-t max-md:not-first:border-[color-mix(in_srgb,var(--border)_58%,transparent)]"
                    >
                      <td
                        className={cn(
                          cellClass,
                          rowBorder,
                          "max-md:col-span-full",
                        )}
                      >
                        <button
                          type="button"
                          className={cn(
                            siteCellClass,
                            "w-full overflow-hidden text-left hover:text-primary max-md:flex-wrap max-md:whitespace-normal",
                          )}
                          title={status}
                          onClick={() => row.onDetail(row.name)}
                        >
                          <SiteLogo
                            src={row.icon}
                            className={siteCellIconClass}
                          />
                          <span className="min-w-0 truncate">{row.name}</span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              badgeClass,
                              row.type === "domestic"
                                ? "bg-info-soft text-info-text"
                                : "bg-ok-soft text-ok-text",
                            )}
                          >
                            {t(
                              row.type === "domestic"
                                ? "categories.domestic"
                                : "categories.international",
                            )}
                          </Badge>
                          {row.extra?.map((category) => (
                            <Badge
                              key={category}
                              variant="secondary"
                              className={badgeClass}
                            >
                              {siteCategoryLabels[category] ?? category}
                            </Badge>
                          ))}
                        </button>
                      </td>
                      <td
                        className={cn(
                          cellClass,
                          rowBorder,
                          "px-1.5 py-2 text-left",
                        )}
                      >
                        {row.pending ? (
                          <Pending>{t("common.checking")}</Pending>
                        ) : row.reachable === false ? (
                          <span className="text-destructive">
                            {t("home.websiteAccessBlockedLabel")}
                          </span>
                        ) : row.reachable === true ? (
                          <span className="text-success">
                            {t("home.websiteReachable")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {t("home.waitingToCheck")}
                          </span>
                        )}
                      </td>
                      <td
                        className={cn(
                          cellClass,
                          rowBorder,
                          "pl-1.5 text-[0.9em] [font-family:ui-monospace,monospace] max-md:text-right",
                        )}
                      >
                        {row.geo ? (
                          <IpText ip={row.geo.ip} />
                        ) : row.reachable === true ? (
                          <span className="text-muted-foreground">
                            {t("home.egressUnavailable")}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        className={cn(
                          cellClass,
                          rowBorder,
                          "text-[0.88em] max-md:col-span-full max-md:text-muted-foreground",
                        )}
                      >
                        {row.geoPending ? (
                          <Pending>{t("common.lookingUpEllipsis")}</Pending>
                        ) : location ? (
                          <div className="flex min-w-0 items-center gap-1.5">
                            <CountryFlag code={row.geo?.country_code} />
                            <CompactText text={location} />
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            {t("common.locationDetailsAreUnavailable")}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        {canToggle && (
          <div
            className={cn(
              "px-3 py-1.5 text-center",
              collapsed &&
                "absolute inset-x-0 bottom-0 z-[2] bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--card)_0%,transparent),color-mix(in_srgb,var(--card)_96%,transparent)_78%,var(--card))] backdrop-blur-[5px]",
            )}
          >
            <Button
              ref={toggleRef}
              type="button"
              size="sm"
              variant="ghost"
              className="min-h-11 w-full gap-1 scroll-mb-4 max-md:scroll-mb-22"
              aria-expanded={expanded}
              aria-controls={tableId}
              onClick={() => {
                restoreToggle.current = expanded;
                setExpanded((value) => !value);
              }}
            >
              {expanded ? (
                <ChevronUp aria-hidden="true" />
              ) : (
                <ChevronDown aria-hidden="true" />
              )}
              {expanded ? t("home.collapseAll") : t("home.expandAll")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
