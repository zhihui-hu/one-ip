import { useState } from "react";
import { AuthorContactDetails } from "@/components/author-contact";
import { CountryFlag } from "@/components/country-flag";
import { NumberTicker } from "@/components/number-ticker";
import { SiteLogo } from "@/components/site-logo";
import { ErrorNotice, PageHeading, Pending } from "@/components/toolkit";
import { AnimatedSegmentedTabs } from "@/components/ui/animated-segmented-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/i18n";
import { countryName } from "@/lib/country";
import { endpoint } from "@/lib/network";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { AudienceSections, SlotSection } from "./sections";

type Unavailable = {
  available: false;
  reason: "not-configured" | "no-permission" | "no-access" | "request-failed";
};
type Totals = { visits: number; requests: number; bytes: number };
type RangeKey = "last24h" | "today" | "yesterday" | "last3d" | "last30d";
type CloudflareStats =
  | Unavailable
  | {
      available: true;
      ranges: Record<RangeKey, Totals>;
      days: (Totals & { date: string })[];
      hourly: (Totals & { time: string })[];
      countries: { country: string; visits: number }[];
    };
type RepoStats = {
  repo: string;
  stars: number;
  forks: number;
  views: { count: number; uniques: number };
  clones: { count: number; uniques: number };
  days: { date: string; views: number; uniques: number }[];
  referrers: { referrer: string; count: number; uniques: number }[];
};
type GithubStats = Unavailable | { available: true; repos: RepoStats[] };
type AdvertiseStats = {
  updatedAt: string;
  cloudflare: CloudflareStats;
  github: GithubStats;
};

const ranges: RangeKey[] = [
  "last24h",
  "today",
  "yesterday",
  "last3d",
  "last30d",
];
const hourMs = 3_600_000;
const beijingDate = (ms: number) =>
  new Date(ms + 8 * hourMs).toISOString().slice(0, 10);
const beijingTime = (iso: string) =>
  new Date(Date.parse(iso) + 8 * hourMs)
    .toISOString()
    .slice(5, 16)
    .replace("T", " ");
const formatBytes = (bytes: number) => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  return `${value.toFixed(unit ? 2 : 0)} ${units[unit]}`;
};
const updated = (iso: string) => `${beijingTime(iso)} (UTC+8)`;

function Bars({
  items,
  title,
  start,
  end,
}: {
  items: { label: string; value: number }[];
  title: string;
  start?: string;
  end?: string;
}) {
  const peak = Math.max(1, ...items.map((item) => item.value));
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between text-[12px] text-muted-foreground">
        <span>{title}</span>
        <span>{t("advertise.peak", [peak.toLocaleString()])}</span>
      </div>
      <div
        className="flex h-24 items-end gap-[3px]"
        role="img"
        aria-label={title}
      >
        {items.map((item) => (
          <span
            key={item.label}
            title={`${item.label}: ${item.value.toLocaleString()}`}
            className="min-w-0 flex-1 rounded-t-[2px] bg-primary/70 transition-[height] duration-300 hover:bg-primary"
            style={{ height: `${Math.max(2, (item.value / peak) * 100)}%` }}
          />
        ))}
      </div>
      {(start || end) && (
        <div className="mt-1.5 flex justify-between text-[11px] text-subtle">
          <span>{start}</span>
          <span>{end}</span>
        </div>
      )}
    </section>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="min-w-0">
      <strong className="block text-xl leading-tight font-semibold tabular-nums">
        {typeof value === "number" ? <NumberTicker value={value} /> : value}
      </strong>
      <span className="text-[12px] text-muted-foreground">{label}</span>
    </div>
  );
}

function SourceCard({
  logo,
  title,
  aside,
  children,
  className,
}: {
  logo: string;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
            <SiteLogo website={logo} className="size-4" />
            <span className="truncate">{title}</span>
          </CardTitle>
          {aside}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function UnavailableNote({ reason }: { reason: Unavailable["reason"] }) {
  return (
    <p className="rounded-lg bg-muted px-3 py-4 text-center text-sm text-muted-foreground">
      {t(`advertise.unavailable.${reason}`)}
    </p>
  );
}

function CloudflareCard({
  stats,
  updatedAt,
}: {
  stats: CloudflareStats;
  updatedAt: string;
}) {
  const [range, setRange] = useState<RangeKey>("last24h");
  const aside = stats.available && (
    <AnimatedSegmentedTabs<RangeKey>
      label={t("advertise.siteData")}
      value={range}
      onValueChange={setRange}
      triggerClassName="text-xs px-2.5"
      options={ranges.map((key) => ({
        value: key,
        label: t(`advertise.range.${key}`),
      }))}
    />
  );
  if (!stats.available)
    return (
      <SourceCard logo="https://cloudflare.com" title="Cloudflare">
        <UnavailableNote reason={stats.reason} />
      </SourceCard>
    );
  const totals = stats.ranges[range];
  // Use the server snapshot time so the chart matches the totals.
  const today = beijingDate(Date.parse(updatedAt));
  const hourly = stats.hourly.map((hour) => ({
    ...hour,
    date: beijingDate(Date.parse(hour.time)),
    label: beijingTime(hour.time),
  }));
  const yesterday = beijingDate(Date.parse(`${today}T00:00:00Z`) - 24 * hourMs);
  const chart =
    range === "last30d"
      ? stats.days.map((day) => ({ label: day.date, value: day.visits }))
      : (range === "last24h"
          ? hourly.slice(-24)
          : range === "today"
            ? hourly.filter((hour) => hour.date === today)
            : range === "yesterday"
              ? hourly.filter((hour) => hour.date === yesterday)
              : hourly
        ).map((hour) => ({ label: hour.label, value: hour.visits }));
  return (
    <SourceCard logo="https://cloudflare.com" title="Cloudflare" aside={aside}>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
        <Stat value={totals.visits} label={t("advertise.visits")} />
        <Stat value={totals.requests} label={t("advertise.requests")} />
        <Stat
          value={formatBytes(totals.bytes)}
          label={t("advertise.dataTransfer")}
        />
        <div className="min-w-0">
          <div className="flex h-8 flex-wrap items-center gap-1 overflow-hidden">
            {stats.countries.slice(0, 10).map((item) => (
              <span
                key={item.country}
                title={`${countryName(item.country) ?? item.country}: ${item.visits.toLocaleString()}`}
              >
                <CountryFlag code={item.country} />
              </span>
            ))}
          </div>
          <span className="text-[12px] text-muted-foreground">
            {t("advertise.topRegions")}
          </span>
        </div>
      </div>
      <Bars
        items={chart}
        title={t(
          range === "last30d"
            ? "advertise.dailyVisits"
            : "advertise.hourlyVisits",
        )}
        start={chart[0]?.label}
        end={chart.at(-1)?.label}
      />
      <p className="mt-4 text-[11px] text-subtle">
        {t("advertise.cloudflareNote", [updated(updatedAt)])}
      </p>
    </SourceCard>
  );
}

function GithubCards({
  stats,
  updatedAt,
}: {
  stats: GithubStats;
  updatedAt: string;
}) {
  if (!stats.available)
    return (
      <SourceCard logo="https://github.com" title="GitHub">
        <UnavailableNote reason={stats.reason} />
      </SourceCard>
    );
  return (
    <>
      {stats.repos.map((repo) => (
        <SourceCard key={repo.repo} logo="https://github.com" title={repo.repo}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-5">
            <Stat value={repo.stars} label={t("advertise.stars")} />
            <Stat value={repo.forks} label={t("advertise.forks")} />
            <Stat value={repo.views.count} label={t("advertise.views14d")} />
            <Stat
              value={repo.views.uniques}
              label={t("advertise.uniques14d")}
            />
            <Stat value={repo.clones.count} label={t("advertise.clones14d")} />
          </div>
          <Bars
            items={repo.days.map((day) => ({
              label: day.date,
              value: day.views,
            }))}
            title={t("advertise.dailyViews")}
            start={repo.days[0]?.date}
            end={repo.days.at(-1)?.date}
          />
          {repo.referrers.length > 0 && (
            <section className="mt-5">
              <h3 className="m-0 mb-2 text-[12px] font-normal text-muted-foreground">
                {t("advertise.referrers")}
              </h3>
              <ul className="m-0 grid list-none gap-1.5 p-0 sm:grid-cols-2">
                {repo.referrers.map((item) => (
                  <li
                    key={item.referrer}
                    className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-1.5 text-sm"
                  >
                    <span className="truncate">{item.referrer}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {item.count.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className="mt-4 text-[11px] text-subtle">
            {t("advertise.githubNote", [updated(updatedAt)])}
          </p>
        </SourceCard>
      ))}
    </>
  );
}

export default function AdvertisePage() {
  const query = useQuery({
    queryKey: ["advertise-stats"],
    queryFn: ({ signal }) =>
      endpoint<AdvertiseStats>("/advertise/stats", { signal }),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  return (
    <div className="grid gap-3 [&>[data-slot=card]]:mt-0">
      <PageHeading title={t("advertise.title")} />
      <p className="m-0 text-[13px] text-muted-foreground">
        {t("advertise.siteDataHint")}
      </p>
      <ErrorNotice error={query.error} />
      {query.isPending ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            <Pending>{t("advertise.loading")}</Pending>
          </CardContent>
        </Card>
      ) : (
        query.data && (
          <>
            <CloudflareCard
              stats={query.data.cloudflare}
              updatedAt={query.data.updatedAt}
            />
            <GithubCards
              stats={query.data.github}
              updatedAt={query.data.updatedAt}
            />
          </>
        )
      )}
      <AudienceSections />
      <SlotSection />
      <Card id="advertise-contact" className="scroll-mt-20">
        <CardHeader>
          <CardTitle className="text-sm">
            {t("advertise.contactTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-[1fr_minmax(0,320px)] sm:items-center">
          <p className="m-0 text-[13px] text-muted-foreground">
            {t("advertise.contactHint")}
          </p>
          <AuthorContactDetails />
        </CardContent>
      </Card>
    </div>
  );
}
