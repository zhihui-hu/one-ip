import { t } from "@/i18n";
import { asnLabel, itemName, shareLabel } from "./layout";
import { type RouteItem, type RouteTopology } from "./types";

const headingClass =
  "pt-2 pb-1 text-[10px] font-semibold text-muted-foreground first:pt-0";

export function RouteList({
  topology,
  currentAsn,
  currentAsnName,
}: {
  topology: RouteTopology;
  currentAsn?: number;
  currentAsnName?: string;
}) {
  const row = (item: RouteItem, secondary = false, showShare = true) => (
    <div
      key={`${secondary ? "secondary" : "direct"}-${item.asn}`}
      className="relative grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2.5 border-b border-border/65 pt-[5px] pb-[7px] last:border-b-0"
    >
      <div className="grid min-w-0 grid-cols-[84px_minmax(0,1fr)] items-baseline gap-2 text-[11px] max-md:grid-cols-[72px_minmax(0,1fr)] max-md:gap-1.5">
        <strong className="text-[11px] text-foreground tabular-nums">
          {asnLabel(item.asn)}
        </strong>
        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-foreground">
          {itemName(item, currentAsn, currentAsnName)}
          {secondary && item.via?.length ? (
            <small className="block overflow-hidden text-[10px] text-ellipsis whitespace-nowrap text-muted-foreground">
              {t("ip.via", [item.via.map(asnLabel).join(" / ")])}
            </small>
          ) : null}
        </span>
      </div>
      {showShare && (
        <>
          <em className="self-baseline text-[10px] text-muted-foreground not-italic tabular-nums">
            {shareLabel(item.share)}
          </em>
          <i
            className={`pointer-events-none absolute bottom-0.5 left-0 h-0.5 origin-left rounded-[999px] ${item.tier1 ? "bg-info-text" : "bg-info-text/55"}`}
            style={{ width: `${Math.min(100, Math.max(0, item.share))}%` }}
          />
        </>
      )}
    </div>
  );

  return (
    <div className="mt-2.5" aria-label={t("ip.routePathDetails")}>
      <div className={headingClass}>{t("ip.originAs")}</div>
      {topology.origins.map((item) => row(item, false, false))}
      <div className={headingClass}>{t("ip.directUpstreamPathShare")}</div>
      {topology.direct.map((item) => row(item))}
      {!!topology.secondary.length && (
        <>
          <div className={headingClass}>
            {t("ip.secondLevelUpstreamBlueTier1Label")}
          </div>
          {topology.secondary.map((item) => row(item, true))}
        </>
      )}
    </div>
  );
}
