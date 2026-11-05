import { lazy, Suspense, useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CopyButton } from "@/components/copy-button";
import { CountryFlag } from "@/components/country-flag";
import { DataTable } from "@/components/data-table";
import { NumberTicker } from "@/components/number-ticker";
import { IpText, ToolCard, Pending } from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { t } from "@/i18n";
import { ipScoreColor } from "@/lib/ip-score";
import type { Geo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { hideIpAtom } from "@/store/privacy";
import { useAtom } from "jotai";
import { Crown, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { coffeeThreatLabels, type CoffeeLookup } from "./coffee";
import { IpFacts } from "./field-help";
import { IpLatency } from "./latency";
import { LocationMap } from "./location-map";
import { PerfectScoreEffects } from "./perfect-score-effects";
import { ipProfile } from "./profile";
import {
  dossierTopClass,
  reputationScaleClass,
  routeGraphStateClass,
} from "./styles";
import { useIpLatency } from "./use-ip-latency";

const IpProfileGraph = lazy(() => import("./profile-graph"));
const IpRouteGraph = lazy(() => import("./route-graph"));
const IpReputationScale = lazy(() =>
  import("./profile-graph").then((module) => ({
    default: module.IpReputationScale,
  })),
);

type ChipTone = "neutral" | "good" | "bad" | "residential" | "warn";
const chipToneClass: Record<ChipTone, string> = {
  neutral: "bg-[color-mix(in_srgb,var(--primary)_5%,transparent)] text-primary",
  good: "bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-primary",
  residential:
    "bg-[color-mix(in_srgb,var(--primary)_25%,transparent)] text-primary",
  warn: "bg-[color-mix(in_srgb,var(--warning)_9%,transparent)] text-warn",
  bad: "bg-[color-mix(in_srgb,var(--danger)_9%,transparent)] text-danger",
};
const perfectDossierClass =
  "relative isolate border border-[rgba(190,157,94,0.55)] bg-[radial-gradient(circle_at_86%_8%,rgba(226,185,106,0.16),transparent_28%),linear-gradient(118deg,#0b111c_0%,#181d2a_48%,#332a20_100%)] text-foreground shadow-[0_0_0_1px_rgba(117,99,72,0.85),0_0_0_3px_rgba(77,59,32,0.48),inset_0_0_0_1px_rgba(244,218,157,0.22),inset_0_0_0_3px_#1e2229,0_14px_36px_rgba(19,14,7,0.25)] [--border:#514837] [--card-foreground:#f3ecdf] [--card:#191d24] [--foreground:#f3ecdf] [--muted-foreground:#bbb3a4] [--muted:#242830] [--primary:#e3c68e] [--ring:#e3c68e] [&>:not([data-perfect-effects]):not(a)]:relative [&>:not([data-perfect-effects]):not(a)]:z-1";
// Masonry columns: fact cards of uneven height pack tightly instead of leaving grid gaps.
const factColumnsClass =
  "columns-1 gap-x-2.5 md:columns-2 xl:columns-3 [&>*]:mb-2.5 [&>*]:break-inside-avoid [&>*:last-child]:mb-0 empty:hidden";
const dossierHeadLineClass =
  "max-md:items-start max-md:text-[12px] max-md:leading-[1.6]";

export function IpDetails({
  data,
  search,
  recent,
}: {
  data: CoffeeLookup;
  search?: ReactNode;
  recent?: ReactNode;
}) {
  const mobile = useIsMobile();
  const [hidden, setHidden] = useAtom(hideIpAtom);
  const d = data.coffee;
  const threats = coffeeThreatLabels(d, true);
  const profile = useMemo(() => ipProfile(d), [d]);
  const inbound = useIpLatency(d.ip);
  const chip = (label: string, tone: ChipTone = "neutral", title?: string) => (
    <span
      data-ip-chip=""
      className={`inline-flex items-center rounded-[7px] px-[9px] py-[3px] text-[12px] leading-[1.3] ${chipToneClass[tone]}`}
      title={title}
    >
      {label}
    </span>
  );
  const yesNo = (value?: boolean) =>
    chip(
      typeof value !== "boolean"
        ? t("common.unknown")
        : value
          ? t("common.yes")
          : t("common.no"),
    );
  const riskFlag = (value?: boolean) =>
    typeof value !== "boolean"
      ? chip(t("common.unknown"))
      : value
        ? chip(t("common.detected"), "bad")
        : chip(t("common.notDetected"), "good");
  const number = (value?: number) =>
    typeof value === "number" && Number.isFinite(value) ? (
      <NumberTicker
        value={value}
        formatValue={(v) => Math.round(v).toLocaleString()}
      />
    ) : (
      "—"
    );
  const seen = (value?: number) =>
    value ? new Date(value * 1000).toLocaleDateString() : "—";
  const score =
    typeof d.trust_score === "number" &&
    Number.isFinite(d.trust_score) &&
    d.trust_score >= 0 &&
    d.trust_score <= 100
      ? d.trust_score
      : null;
  const rpki: Record<string, string> = {
    valid: t("ip.valid"),
    invalid: t("ip.invalid"),
    notfound: t("ip.noRoaPublished"),
    unknown: t("common.unknown"),
  };
  const perfect = score === 100;
  const riskNotice = profile.risk?.severity === "notice";
  return (
    <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)] gap-2.5 [&_[data-slot=card]]:min-w-0 [&_[data-slot=card]]:gap-1.5 [&_[data-slot=card]]:rounded-[14px] [&_[data-slot=card]]:border-0 [&_[data-slot=card]]:border-current [&_[data-slot=card]]:[box-shadow:none] [&_[data-slot=card]]:[--card-spacing:12px] max-md:[&_[data-slot=card]]:gap-1 max-md:[&_[data-slot=card]]:[--card-spacing:10px] [&_[data-slot=card-title]]:text-[14px] [&_[data-slot=card-title]]:font-semibold [&_[data-slot=card-title]]:text-foreground [&_:is([data-slot=table-row],[data-slot=table-header],[data-slot=table-cell])]:border-0 [&_:is([data-slot=table-row],[data-slot=table-header],[data-slot=table-cell])]:border-current">
      <div
        className={`${dossierTopClass} ${perfect ? perfectDossierClass : "bg-card"}`}
      >
        {perfect && <PerfectScoreEffects />}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 max-md:relative max-md:[align-items:start] max-md:gap-3">
          <div className="min-w-0">
            <div
              className={`flex flex-wrap items-center gap-2 ${dossierHeadLineClass}`}
            >
              <h2
                className={`min-w-0 break-all text-xl font-semibold max-md:pr-0 max-md:text-[length:clamp(18px,5vw,22px)] max-md:leading-[1.35] ${perfect ? " *:text-[#edcf91] *:[text-shadow:0_1px_0_rgba(255,243,198,0.46),0_-1px_0_rgba(0,0,0,0.72),0_3px_7px_rgba(0,0,0,0.58),0_0_18px_rgba(226,185,106,0.16)]" : ""}`}
              >
                <IpText ip={d.ip} link={false} />
              </h2>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={
                    hidden
                      ? t("common.showIpAddresses")
                      : t("common.hideIpAddresses")
                  }
                  title={
                    hidden
                      ? t("common.showIpAddresses")
                      : t("common.hideIpAddresses")
                  }
                  aria-pressed={hidden}
                  onClick={() => setHidden((value) => !value)}
                >
                  {hidden ? (
                    <EyeOff aria-hidden="true" />
                  ) : (
                    <Eye aria-hidden="true" />
                  )}
                </Button>
                <CopyButton value={d.ip} />
              </div>
            </div>
            <div
              className={`mt-1 flex items-center gap-2 text-sm text-muted-foreground ${dossierHeadLineClass}`}
            >
              <CountryFlag code={data.geo.country_code} />
              <span>
                {[d.country, d.region, d.city, d.isp]
                  .filter(Boolean)
                  .filter((v, i, all) => all.indexOf(v) === i)
                  .join(" · ")}
              </span>
            </div>
          </div>
          <div
            className={cn(
              "flex flex-col-reverse items-center gap-1 px-2 text-[11px] whitespace-nowrap text-primary max-md:col-[2] max-md:row-[1] max-md:justify-self-end max-md:gap-1 max-md:text-[11px]",
              perfect ? "bg-transparent p-0 max-md:p-0" : "max-md:px-1",
            )}
            style={{ color: ipScoreColor(score) }}
            data-perfect-badge={perfect ? "" : undefined}
          >
            <span
              data-perfect-label={score === 100 ? "" : undefined}
              className={
                perfect
                  ? "inline-flex items-center gap-1 rounded-[5px] border border-[#756348] bg-[#24272e] px-1.5 py-[3px] text-[10px] leading-[1.4] font-medium text-[#e3c68e] shadow-[inset_0_1px_0_rgba(255,240,193,0.24),0_2px_5px_rgba(0,0,0,0.4)] [text-shadow:0_1px_0_rgba(255,243,198,0.4),0_-1px_0_rgba(0,0,0,0.72),0_2px_4px_rgba(0,0,0,0.5)]"
                  : undefined
              }
            >
              {score === 100 && <Crown size={13} aria-hidden="true" />}
              {score === 100
                ? t("common.perfectReputation")
                : t("common.ipReputation")}
            </span>
            <strong
              className={cn(
                perfect
                  ? "text-[36px] text-[#efdaad] [text-shadow:0_1px_0_rgba(255,243,198,0.48),0_-1px_0_rgba(0,0,0,0.72),0_4px_8px_rgba(0,0,0,0.56),0_0_16px_rgba(239,218,173,0.2)] max-md:text-[28px]"
                  : "text-[56px] max-md:text-[36px]",
                "leading-none tracking-[-0.04em] tabular-nums",
              )}
            >
              {score == null ? "—" : <NumberTicker value={score} />}
            </strong>
          </div>
        </div>
        <Suspense fallback={<div className={reputationScaleClass} />}>
          <IpReputationScale profile={profile} />
        </Suspense>
        {search}
        {recent}
      </div>
      {profile.risk && (
        <div
          className={`flex items-start gap-2.5 rounded-[12px] border px-3.5 py-3 ${riskNotice ? "border-[#e4c88d] bg-[#fff6e5] text-[#805b16] dark:border-[#746039] dark:bg-[#30291d] dark:text-[#e5c995]" : "border-[#e8b7b7] bg-[#fff1f1] text-[#9b2727] dark:border-[#75404b] dark:bg-[#301f24] dark:text-[#f2b4ba]"}`}
          data-severity={profile.risk.severity}
          role="alert"
        >
          <ShieldAlert
            size={20}
            aria-hidden="true"
            className="mt-0.5 flex-none"
          />
          <div className="min-w-0">
            <strong className="text-[13px]">{profile.risk.title}</strong>
            {!!profile.risk.flags.length && (
              <ul className="mt-1.5 flex flex-wrap gap-1">
                {profile.risk.flags.map((flag) => (
                  <li
                    key={flag}
                    className={`rounded-[4px] px-1.5 py-0.5 text-[11px] wrap-anywhere ${riskNotice ? "bg-[#f3e4c6] dark:bg-[#443723]" : "bg-[#f7dede] dark:bg-[#44272e]"}`}
                  >
                    {flag}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-[5px] text-[12px] leading-[1.7] wrap-anywhere">
              {profile.risk.description}
            </p>
          </div>
        </div>
      )}
      <Suspense
        fallback={
          <ToolCard title={t("common.ipProfile")}>
            <div className="grid h-25 place-items-center text-[12px]">
              <Pending>{t("ip.loadingProfileMap")}</Pending>
            </div>
          </ToolCard>
        }
      >
        <IpProfileGraph
          key={d.ip}
          data={d}
          profile={profile}
          inbound={inbound}
        />
      </Suspense>
      <div className={factColumnsClass}>
        <ToolCard title={t("ip.networkAttributes")}>
          <IpFacts
            rows={[
              [t("ip.registeredCountry"), d.registered_country],
              [t("common.datacenter"), yesNo(d.is_datacenter)],
              [t("common.mobileNetwork"), yesNo(d.is_mobile)],
              [t("ip.company"), d.company_name],
              [t("ip.datacenterName"), d.datacenter_name || "—"],
            ]}
          />
        </ToolCard>
        <ToolCard title={t("ip.asnIsp")}>
          <IpFacts
            rows={[
              ["ASN", d.asn ? `AS${d.asn}` : undefined],
              [t("ip.isp"), d.isp],
              [t("ip.asnName"), d.asname],
              [t("ip.asnOrganization"), d.asOrganization],

              ["CIDR", d.cidr],
              [t("ip.asnSelfReportedType"), d.asn_kind],
              [t("ip.asnIpv4Addresses"), number(d.asn_ipv4_count)],
              [t("ip.asnRegistered"), d.asn_allocated],
            ]}
          />
        </ToolCard>
        <ToolCard title={t("ip.technicalDetails")}>
          <IpFacts
            rows={[
              [t("ip.addressType"), d.ip.includes(":") ? "IPv6" : "IPv4"],
              [
                t("ip.ipRange"),
                d.range?.first && d.range?.last
                  ? `${d.range.first} – ${d.range.last}`
                  : undefined,
              ],
              [t("ip.addressCount"), number(d.range?.count)],
              [t("ip.estimatedBandwidth"), d.asn_tbps],
              ["Bogon", riskFlag(d.is_bogon)],
              [t("ip.redditRestriction"), riskFlag(d.reddit_blocked)],
              ["PTR", d.rdns || "—"],
              [
                "RPKI",
                d.rpki_status
                  ? (rpki[d.rpki_status.toLowerCase()] ?? d.rpki_status)
                  : t("common.unknown"),
              ],
            ]}
          />
        </ToolCard>
        <ToolCard title={t("ip.riskSignals")}>
          <IpFacts
            rows={[
              ["VPN", riskFlag(d.is_vpn)],
              [t("common.proxy"), riskFlag(d.is_proxy)],
              ["Tor", riskFlag(d.is_tor)],
              [t("common.crawlerFlag"), riskFlag(d.is_crawler)],
              [t("common.abuseFlag"), riskFlag(d.is_abuser)],
              [
                t("ip.abuseScore"),
                d.intelligence?.abuser_score_raw ?? d.abuser_score,
              ],
            ]}
          />
        </ToolCard>
        <ToolCard title={t("ip.ipIntelligenceThreatIndicators")}>
          <IpFacts
            rows={[
              [
                t("ip.threatFlags"),
                Array.isArray(d.intelligence?.threats)
                  ? threats.length
                    ? chip(threats.join(" · "), "bad")
                    : chip(t("ip.noApparentThreats"), "good")
                  : chip(t("common.unknown")),
              ],
              [t("ip.abuseLevel"), d.intelligence?.abuser_level],
              [
                t("ip.httpHoneypotBlacklist"),
                d.intelligence?.rep_threat == null
                  ? chip(t("common.unknown"))
                  : JSON.stringify(d.intelligence.rep_threat),
              ],
              [
                t("ip.vpnDetails"),
                d.vpn_trace == null
                  ? "—"
                  : typeof d.vpn_trace === "string"
                    ? d.vpn_trace
                    : JSON.stringify(d.vpn_trace),
              ],
              [t("ip.accessAssessment"), d.ai_verdict?.label],
              [
                t("ip.assessmentConfidence"),
                d.ai_verdict?.confidence == null ? (
                  "—"
                ) : (
                  <span key="confidence">
                    {number(d.ai_verdict.confidence)}%
                  </span>
                ),
              ],
              [t("ip.assessmentReasoning"), d.ai_verdict?.reasoning],
            ]}
          />
        </ToolCard>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ToolCard title={t("ip.locationSourceComparison")}>
          {mobile ? (
            data.sources.length ? (
              <ul className="grid gap-2">
                {data.sources.map((source, index) => (
                  <li
                    key={`${source.source}-${index}`}
                    className="min-w-0 rounded-[8px] bg-muted p-2.5"
                  >
                    <span className="text-[11px] text-muted-foreground">
                      {source.source}
                    </span>
                    <div className="mt-1 flex items-start gap-1.5 text-[13px] wrap-anywhere">
                      <CountryFlag code={source.country_code} />
                      <span>
                        {[source.country, source.region, source.city]
                          .filter(Boolean)
                          .filter((value, i, all) => all.indexOf(value) === i)
                          .join(" · ") || t("common.unknown")}
                      </span>
                    </div>
                    {source.latitude != null && source.longitude != null && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {t("ip.latitude")} {source.latitude} ·{" "}
                        {t("ip.longitudeLabel")} {source.longitude}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("ip.noLocationDataObtained")}
              </p>
            )
          ) : (
            <DataTable<Geo>
              className="min-w-0 max-w-full rounded-none bg-transparent overflow-x-auto overscroll-x-contain [&_:is(th,td)]:px-2.5 [&_:is(th,td)]:py-2 [&_:is(th,td)]:whitespace-nowrap [&_:is(th,td)]:[word-break:normal] [&_:is(th,td)]:wrap-normal [&_table]:table-auto"
              columns={[
                { accessorKey: "source", header: t("common.dataSource") },
                {
                  id: "location",
                  header: t("common.location"),
                  cell: ({ row }) => {
                    const source = row.original;
                    const place = [source.country, source.region, source.city]
                      .filter(Boolean)
                      .filter((value, i, all) => all.indexOf(value) === i)
                      .join(" · ");
                    return (
                      <span
                        className="flex min-w-0 items-center gap-1.5"
                        title={place}
                      >
                        <CountryFlag code={source.country_code} />
                        <span className="max-w-[200px] truncate">
                          {place || t("common.unknown")}
                        </span>
                      </span>
                    );
                  },
                },
                {
                  id: "coordinates",
                  header: t("ip.coordinates"),
                  cell: ({ row }) =>
                    row.original.latitude != null &&
                    row.original.longitude != null ? (
                      <span className="text-muted-foreground tabular-nums">
                        {row.original.latitude}, {row.original.longitude}
                      </span>
                    ) : (
                      "—"
                    ),
                },
              ]}
              data={data.sources}
              empty={t("ip.noLocationDataObtained")}
            />
          )}
        </ToolCard>
        <LocationMap
          geo={
            data.sources.find(
              (source) =>
                source.latitude != null &&
                source.longitude != null &&
                source.latitude === data.geo.latitude &&
                source.longitude === data.geo.longitude,
            ) ?? data.geo
          }
        />
      </div>
      <IpLatency measurement={inbound} />
      <div className={factColumnsClass}>
        {!!d.related_domains?.length && (
          <ToolCard title={t("ip.relatedDomains")}>
            <IpFacts
              rows={d.related_domains.map((item) => [item.domain, item.via])}
            />
          </ToolCard>
        )}
        {!!d.location_history?.length && (
          <ToolCard title={t("ip.locationHistory")}>
            <IpFacts
              rows={d.location_history.map((row) => [
                seen(row.seen_at),
                [row.country, row.region, row.city].filter(Boolean).join(" · "),
              ])}
            />
          </ToolCard>
        )}
        {!!d.asn_history?.length && (
          <ToolCard title={t("ip.asnHistory")}>
            <IpFacts
              rows={d.asn_history.map((row) => [
                seen(row.seen_at),
                `AS${row.asn ?? "—"} · ${row.asn_org ?? "—"}`,
              ])}
            />
          </ToolCard>
        )}
        {!!d.company_history?.length && (
          <ToolCard title={t("ip.companyHistory")}>
            <IpFacts
              rows={d.company_history.map((row) => [
                seen(row.seen_at),
                [row.company_name, row.company_type]
                  .filter(Boolean)
                  .join(" · "),
              ])}
            />
          </ToolCard>
        )}
      </div>
      {!!d.dc_neighbors?.length && (
        <ToolCard title={t("ip.relatedNetworkAddresses")}>
          {mobile ? (
            <ul className="divide-y divide-border/60">
              {d.dc_neighbors.map((row, index) => (
                <li
                  key={`${row.ip}-${index}`}
                  className="min-w-0 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="min-w-0 text-sm font-semibold">
                      <IpText ip={row.ip} />
                    </span>
                    <time
                      className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-muted-foreground"
                      aria-label={t("ip.recorded")}
                    >
                      {seen(row.seen_at)}
                    </time>
                  </div>
                  {row.city && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.city}
                    </p>
                  )}
                  {row.company && (
                    <p className="mt-1 break-words text-xs leading-relaxed">
                      {row.company}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <DataTable
              className="rounded-none bg-transparent"
              columns={[
                {
                  accessorKey: "ip",
                  header: "IP",
                  cell: ({ row }) => <IpText ip={row.original.ip} />,
                },
                { accessorKey: "city", header: t("ip.city") },
                { accessorKey: "company", header: t("ip.company") },
                {
                  accessorKey: "seen_at",
                  header: t("ip.recorded"),
                  cell: ({ row }) => seen(row.original.seen_at),
                },
              ]}
              data={d.dc_neighbors}
            />
          )}
        </ToolCard>
      )}
      <Suspense
        fallback={
          <ToolCard title={t("ip.bgpRouteTopology")}>
            <div className={routeGraphStateClass}>
              <Pending>{t("ip.readingRoutingData")}</Pending>
            </div>
          </ToolCard>
        }
      >
        <IpRouteGraph
          ip={d.ip}
          currentAsn={d.asn}
          currentAsnName={d.asOrganization ?? d.asname}
        />
      </Suspense>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link to={`/ping/?host=${encodeURIComponent(d.ip)}`}>
            {t("common.globalLatencyTest")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
