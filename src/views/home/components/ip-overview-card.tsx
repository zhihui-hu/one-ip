import { Link } from "react-router-dom";
import { CopyButton } from "@/components/copy-button";
import { CountryFlag } from "@/components/country-flag";
import { NumberTicker } from "@/components/number-ticker";
import { IpText, Pending } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/i18n";
import { companyTypeColors } from "@/lib/ip-badge-colors";
import { ipScoreColor } from "@/lib/ip-score";
import type { Geo } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { lookupIp } from "@/views/ip/api";
import { PerfectScoreEffects } from "@/views/ip/perfect-score-effects";
import type { UseQueryResult } from "@tanstack/react-query";
import { Crown } from "lucide-react";
import { IpCardMap } from "./ip-card-map";
import "../home.css";
import { homePrimaryBlockClass, homePrimaryCardClass } from "../styles";

export function IpOverviewCard({
  label,
  version,
  data,
  pending,
  geoQuery,
  typeQuery,
}: {
  label: string;
  version: number;
  data?: Geo;
  pending: boolean;
  geoQuery?: UseQueryResult<Geo>;
  typeQuery?: UseQueryResult<Awaited<ReturnType<typeof lookupIp>>>;
}) {
  const geo = data ? { ...data, ...geoQuery?.data } : undefined;
  const classification = data ? typeQuery : undefined;
  const company = classification?.isSuccess
    ? classification.data.coffee
    : undefined;
  const mapGeo =
    geo?.latitude != null && geo?.longitude != null
      ? geo
      : classification?.isSuccess
        ? classification.data.geo
        : undefined;
  const score = company?.trust_score;
  const hasScore =
    typeof score === "number" &&
    Number.isFinite(score) &&
    score >= 0 &&
    score <= 100;
  const typeLabels = company
    ? [
        company.company_type
          ? {
              label: company.company_type,
              color:
                companyTypeColors[company.company_type.toLowerCase()] ??
                "bg-primary/5 text-primary dark:bg-primary/10",
            }
          : null,
        company.is_public_service === true
          ? {
              label: t("common.publicService"),
              color: "bg-primary/15 text-primary dark:bg-primary/20",
            }
          : null,
        company.isResidential === true && !company.is_public_service
          ? {
              label: t("common.residentialIp"),
              color: "bg-primary/25 text-primary dark:bg-primary/30",
            }
          : null,
        company.is_datacenter === true && !company.is_public_service
          ? {
              label: t("home.datacenterIp"),
              color: "bg-primary/5 text-primary dark:bg-primary/10",
            }
          : null,
        company.is_mobile === true
          ? {
              label: t("common.mobileNetwork"),
              color: "bg-primary/15 text-primary dark:bg-primary/20",
            }
          : null,
        company.is_proxy === true ||
        company.is_vpn === true ||
        company.is_tor === true
          ? {
              label: t("home.proxyVpnTor"),
              color: "bg-primary/10 text-primary dark:bg-primary/15",
            }
          : null,
      ].filter((item) => item !== null)
    : [];
  const loading = pending || Boolean(data && geoQuery?.isPending);
  const perfect = score === 100;
  return (
    <Card
      className={cn(
        homePrimaryCardClass,
        "relative isolate",
        perfect &&
          "home-ip-card-perfect text-foreground [--border:#514837] [--card-foreground:#f3ecdf] [--card:#191d24] [--foreground:#f3ecdf] [--muted-foreground:#bbb3a4] [--muted:#242830] [--primary:#e3c68e] [--ring:#e3c68e] [--subtle:var(--muted-foreground)]",
      )}
    >
      {perfect && <PerfectScoreEffects />}
      <IpCardMap geo={mapGeo} />
      {data && (
        <Link
          to={`/ip/${encodeURIComponent(data.ip)}`}
          target="_blank"
          rel="noopener"
          aria-label={`${label} · ${t("home.ipDetectionNewTab")}`}
          className="absolute inset-0 z-10 rounded-[inherit] transition-colors hover:bg-primary/[0.025] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        />
      )}
      <CardContent className={cn(homePrimaryBlockClass, "relative")}>
        <div className="mb-2 flex items-center justify-between gap-3 text-[11px] tracking-[0.035em] text-subtle">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span>{label}</span>
            {typeLabels.map((type) => (
              <Badge
                key={type.label}
                variant="secondary"
                className={`h-4 px-1.5 text-[10px] font-medium tracking-normal ${type.color}`}
              >
                {type.label}
              </Badge>
            ))}
          </div>
        </div>
        <div
          className={cn(
            "relative mb-1 flex items-center gap-3 max-md:gap-2",
            hasScore && "pr-24 max-md:pr-20",
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 text-[length:clamp(22px,2.5vw,28px)] leading-[1.25] font-[750] tracking-[-0.025em] wrap-anywhere max-md:text-[24px] [&>:first-child]:shrink-0">
            {pending ? (
              <Pending>{t("common.loading")}</Pending>
            ) : geo ? (
              <>
                <CountryFlag code={geo.country_code} size="lg" />
                <IpText
                  ip={geo.ip}
                  link={false}
                  className={cn(
                    "max-w-[15ch] overflow-hidden [font-weight:inherit]",
                    perfect
                      ? "text-[#edcf91] [text-shadow:0_1px_0_rgba(255,243,198,0.46),0_-1px_0_rgba(0,0,0,0.72),0_3px_7px_rgba(0,0,0,0.58),0_0_18px_rgba(226,185,106,0.16)]"
                      : "text-primary",
                  )}
                />
                <CopyButton
                  value={geo.ip}
                  className="relative z-20 size-6 shrink-0 text-muted-foreground"
                />
              </>
            ) : (
              <span className="text-muted-foreground">
                {t("home.couldNotDetectIpv")}
                {version}
              </span>
            )}
          </div>
          {hasScore && (
            <div
              className={cn(
                "absolute top-0 right-0 flex shrink-0 flex-col-reverse items-center gap-1 text-[11px] whitespace-nowrap text-primary",
                perfect
                  ? "bg-transparent px-0 max-md:px-1"
                  : "px-2 max-md:px-1",
              )}
              style={{ color: ipScoreColor(score) }}
              data-perfect-badge={perfect ? "" : undefined}
            >
              <span
                data-perfect-label={perfect ? "" : undefined}
                className={
                  perfect
                    ? "inline-flex items-center gap-1 rounded-[5px] border border-[#756348] bg-[#24272e] px-1.5 py-[3px] text-[10px] leading-[1.4] font-medium text-[#e3c68e] shadow-[inset_0_1px_0_rgba(255,240,193,0.24),0_2px_5px_rgba(0,0,0,0.4)] text-shadow-[0_1px_0_rgba(255,243,198,0.4),0_-1px_0_rgba(0,0,0,0.72),0_2px_4px_rgba(0,0,0,0.5)]"
                    : undefined
                }
              >
                {perfect && <Crown size={13} aria-hidden="true" />}
                {perfect
                  ? t("common.perfectReputation")
                  : t("common.ipReputation")}
              </span>
              <strong
                className={cn(
                  perfect
                    ? "text-[36px] text-[#efdaad] text-shadow-[0_1px_0_rgba(255,243,198,0.48),0_-1px_0_rgba(0,0,0,0.72),0_4px_8px_rgba(0,0,0,0.56),0_0_16px_rgba(239,218,173,0.2)] max-md:text-[44px]"
                    : "text-[56px] max-md:text-[44px]",
                  "leading-none tracking-[-0.04em] tabular-nums",
                )}
              >
                <NumberTicker value={score} />
              </strong>
            </div>
          )}
        </div>
        <div
          className={cn(
            "text-[13px] leading-[1.6] text-muted-foreground",
            hasScore && "pr-24 max-md:pr-20",
          )}
        >
          {loading ? (
            <Pending>{t("common.lookingUpLocationDetails")}</Pending>
          ) : geo?.country || geo?.city || geo?.isp ? (
            <>
              <p>
                {[geo.country, geo.region, geo.city]
                  .filter(Boolean)
                  .filter((item, i, all) => all.indexOf(item) === i)
                  .join(" · ")}
              </p>
              <p className="mt-1 text-[11px] leading-(--text-xs--line-height) text-subtle">
                {[geo.isp, geo.asn ? `AS${geo.asn}` : undefined]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </>
          ) : data ? (
            <div className="flex items-center justify-between gap-2 text-xs">
              <span>{t("common.locationDetailsAreUnavailable")}</span>
              <button
                type="button"
                className="relative z-20 shrink-0 text-primary"
                onClick={() => geoQuery?.refetch()}
              >
                {t("common.retry")}
              </button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
