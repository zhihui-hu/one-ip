export type Unavailable = {
  available: false;
  reason: "not-configured" | "no-permission" | "no-access" | "request-failed";
};

export type Metrics = {
  uniques: number;
  requests: number;
  pageViews: number;
  bytes: number;
  cachedBytes: number;
};
export type RangeKey = "last24h" | "today" | "yesterday" | "last3d" | "last30d";
export type CloudflareStats =
  | Unavailable
  | {
      available: true;
      ranges: Record<RangeKey, Metrics>;
      hourly: (Metrics & { time: string })[];
      daily: (Metrics & { date: string })[];
      countries: { country: string; requests: number }[];
    };

export type RepoStats = {
  repo: string;
  stars: number;
  forks: number;
  views: { count: number; uniques: number };
  clones: { count: number; uniques: number };
  days: { date: string; views: number; uniques: number }[];
};
export type GithubStats = Unavailable | { available: true; repos: RepoStats[] };

export type AdvertiseStats = {
  updatedAt: string;
  cloudflare: CloudflareStats;
  github: GithubStats;
};
