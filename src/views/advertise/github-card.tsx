import { useMemo } from "react";
import { t } from "@/i18n";
import { formatCount, updatedLabel } from "./format";
import {
  ChartPanel,
  MetricTile,
  SourceCard,
  SourceNote,
  UnavailableNote,
} from "./stats-ui";
import type { GithubStats, RepoStats } from "./types";

function RepoCard({ repo, updatedAt }: { repo: RepoStats; updatedAt: string }) {
  const labels = useMemo(
    () => repo.days.map((day) => day.date.slice(5)),
    [repo],
  );
  const series = useMemo(
    () => [
      {
        name: t("advertise.views"),
        values: repo.days.map((day) => day.views),
      },
      {
        name: t("advertise.uniqueVisitors"),
        values: repo.days.map((day) => day.uniques),
      },
    ],
    [repo],
  );
  return (
    <SourceCard
      logo="https://github.com"
      title={repo.repo}
      aside={
        <span className="text-[12px] text-muted-foreground">
          {t("advertise.last14d")}
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <MetricTile
          label={t("advertise.stars")}
          value={repo.stars}
          format={formatCount}
        />
        <MetricTile
          label={t("advertise.forks")}
          value={repo.forks}
          format={formatCount}
        />
        <MetricTile
          label={t("advertise.views")}
          value={repo.views.count}
          format={formatCount}
        />
        <MetricTile
          label={t("advertise.uniqueVisitors")}
          value={repo.views.uniques}
          format={formatCount}
        />
        <MetricTile
          label={t("advertise.clones")}
          value={repo.clones.count}
          format={formatCount}
        />
      </div>
      <ChartPanel
        title={t("advertise.dailyViews")}
        labels={labels}
        series={series}
        format={formatCount}
      />
      <SourceNote>
        {t("advertise.githubNote", [updatedLabel(updatedAt)])}
      </SourceNote>
    </SourceCard>
  );
}

export function GithubCards({
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
        <RepoCard key={repo.repo} repo={repo} updatedAt={updatedAt} />
      ))}
    </>
  );
}
