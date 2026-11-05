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
import type { lookupIp } from "@/views/ip/api";
import { PerfectScoreEffects } from "@/views/ip/perfect-score-effects";
import type { UseQueryResult } from "@tanstack/react-query";
import { Crown } from "lucide-react";
import { IpCardMap } from "./ip-card-map";

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
  return (
    <Card
      className={`home-primary-card relative isolate${score === 100 ? " ip-dossier-perfect" : ""}`}
    >
      {score === 100 && <PerfectScoreEffects />}
      <IpCardMap geo={mapGeo} />
      {data && (
        <Link
          to={`/lookup/ip/${encodeURIComponent(data.ip)}`}
          aria-label={`${label} · ${t("common.ipLookup")}`}
          className="absolute inset-0 z-10 rounded-[inherit] transition-colors hover:bg-primary/[0.025] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        />
      )}
      <CardContent className="primary-ip-block relative">
        <div className="row-between eyebrow">
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
        <div className="home-address-row">
          <div className="ip-value">
            {pending ? (
              <Pending>{t("common.loading")}</Pending>
            ) : geo ? (
              <>
                <CountryFlag code={geo.country_code} size="lg" />
                <IpText ip={geo.ip} link={false} />
                <CopyButton
                  value={geo.ip}
                  className="relative z-20 size-6 shrink-0 text-muted-foreground"
                />
              </>
            ) : (
              <span className="muted">
                {t("home.couldNotDetectIpv")}
                {version}
              </span>
            )}
          </div>
          {hasScore && (
            <div
              className={`ip-reputation-badge shrink-0${score === 100 ? " ip-reputation-perfect" : ""}`}
              style={{ color: ipScoreColor(score) }}
            >
              <span className={score === 100 ? "ip-perfect-label" : undefined}>
                {score === 100 && <Crown size={13} aria-hidden="true" />}
                {score === 100
                  ? t("common.perfectReputation")
                  : t("common.ipReputation")}
              </span>
              <strong>
                <NumberTicker value={score} />
              </strong>
            </div>
          )}
        </div>
        <div className="primary-ip-meta text-sm text-muted-foreground">
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
              <p className="mt-1 text-xs">
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
