// Public traffic figures for the advertising page. Tokens stay in the Worker;
// only aggregated numbers are returned.

const hourMs = 3_600_000;
const dayMs = 24 * hourMs;
// Site figures are reported in Beijing time.
const offsetMs = 8 * hourMs;
const defaultRepos = "zhihui-hu/one-ip";

const beijingDate = (ms) => new Date(ms + offsetMs).toISOString().slice(0, 10);
const beijingMidnight = (ms) =>
  Math.floor((ms + offsetMs) / dayMs) * dayMs - offsetMs;

const unavailable = (reason) => ({ available: false, reason });

async function graphql(token, query, variables) {
  const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.errors?.length)
    throw new Error(body.errors?.[0]?.message ?? `HTTP ${response.status}`);
  return body.data;
}

const cloudflareQuery = `query ($zone: String!, $filter: ZoneHttpRequestsAdaptiveGroupsFilter_InputObject!) {
  viewer {
    zones(filter: { zoneTag: $zone }) {
      hours: httpRequestsAdaptiveGroups(
        limit: 1000
        filter: $filter
        orderBy: [datetimeHour_ASC]
      ) { count sum { visits edgeResponseBytes } dimensions { datetimeHour } }
      countries: httpRequestsAdaptiveGroups(
        limit: 12
        filter: $filter
        orderBy: [sum_visits_DESC]
      ) { sum { visits } dimensions { clientCountryName } }
    }
  }
}`;

/** Sum hourly buckets in [from, to). */
function total(hours, from, to) {
  let visits = 0;
  let requests = 0;
  let bytes = 0;
  for (const hour of hours)
    if (hour.time >= from && hour.time < to) {
      visits += hour.visits;
      requests += hour.requests;
      bytes += hour.bytes;
    }
  return { visits, requests, bytes };
}

export function summarizeCloudflare(rows, now) {
  const hours = rows.map((row) => ({
    time: Date.parse(row.dimensions.datetimeHour),
    visits: row.sum.visits,
    requests: row.count,
    bytes: row.sum.edgeResponseBytes ?? 0,
  }));
  const today = beijingMidnight(now);
  const days = [];
  for (let start = today - 29 * dayMs; start <= today; start += dayMs)
    days.push({
      date: beijingDate(start),
      ...total(hours, start, start + dayMs),
    });
  const hourly = [];
  const lastHour = Math.floor(now / hourMs) * hourMs;
  // Three days of hours covers the 24h, today, yesterday and 3-day charts.
  for (let start = lastHour - 71 * hourMs; start <= lastHour; start += hourMs)
    hourly.push({
      time: new Date(start).toISOString(),
      ...total(hours, start, start + hourMs),
    });
  return {
    ranges: {
      last24h: total(hours, now - dayMs, now + 1),
      today: total(hours, today, now + 1),
      yesterday: total(hours, today - dayMs, today),
      last3d: total(hours, today - 2 * dayMs, now + 1),
      last30d: total(hours, today - 29 * dayMs, now + 1),
    },
    days,
    hourly,
  };
}

async function cloudflareStats(env, now) {
  const token = env.CLOUDFLARE_ANALYTICS_TOKEN?.trim();
  const zone = env.CLOUDFLARE_ZONE_ID?.trim();
  if (!token || !zone) return unavailable("not-configured");
  // Empty means the whole zone, matching the Cloudflare dashboard overview.
  const host = env.ADVERTISE_ANALYTICS_HOST?.trim() || "";
  // The Free plan caps adaptive queries at 30 days; start at Beijing midnight.
  const from = beijingMidnight(now) - 29 * dayMs;
  try {
    const data = await graphql(token, cloudflareQuery, {
      zone,
      filter: {
        datetime_geq: new Date(from).toISOString(),
        datetime_lt: new Date(now).toISOString(),
        // Real visitors only, as in the dashboard (excludes Workers subrequests).
        requestSource: "eyeball",
        ...(host && { clientRequestHTTPHost: host }),
      },
    });
    const result = data.viewer.zones[0];
    if (!result) return unavailable("no-access");
    return {
      available: true,
      ...summarizeCloudflare(result.hours, now),
      countries: result.countries
        .filter((row) => row.dimensions.clientCountryName)
        .map((row) => ({
          country: row.dimensions.clientCountryName,
          visits: row.sum.visits,
        })),
    };
  } catch (error) {
    console.warn("Cloudflare analytics failed", error?.message);
    return unavailable("request-failed");
  }
}

async function github(token, path) {
  const response = await fetch(`https://api.github.com/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "one-ip-advertise-stats",
    },
  });
  if (!response.ok) {
    const error = new Error(`GitHub ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function repoStats(token, repo) {
  const [info, views, clones, referrers] = await Promise.all([
    github(token, `repos/${repo}`),
    github(token, `repos/${repo}/traffic/views`),
    github(token, `repos/${repo}/traffic/clones`),
    github(token, `repos/${repo}/traffic/popular/referrers`),
  ]);
  return {
    repo,
    stars: info.stargazers_count,
    forks: info.forks_count,
    views: { count: views.count, uniques: views.uniques },
    clones: { count: clones.count, uniques: clones.uniques },
    days: views.views.map((day) => ({
      date: day.timestamp.slice(0, 10),
      views: day.count,
      uniques: day.uniques,
    })),
    referrers: referrers.slice(0, 6).map((item) => ({
      referrer: item.referrer,
      count: item.count,
      uniques: item.uniques,
    })),
  };
}

async function githubStats(env) {
  const token = env.GITHUB_TRAFFIC_TOKEN?.trim();
  if (!token) return unavailable("not-configured");
  const repos = (env.GITHUB_TRAFFIC_REPOS?.trim() || defaultRepos)
    .split(",")
    .map((repo) => repo.trim())
    .filter((repo) => /^[\w.-]+\/[\w.-]+$/.test(repo));
  try {
    return {
      available: true,
      repos: await Promise.all(repos.map((repo) => repoStats(token, repo))),
    };
  } catch (error) {
    console.warn("GitHub traffic failed", error?.message);
    // Traffic endpoints need the "Administration: Read-only" permission.
    return unavailable(
      error?.status === 403 ? "no-permission" : "request-failed",
    );
  }
}

export async function advertiseStats(env) {
  const now = Date.now();
  const [cloudflare, githubTraffic] = await Promise.all([
    cloudflareStats(env, now),
    githubStats(env),
  ]);
  return {
    updatedAt: new Date(now).toISOString(),
    cloudflare,
    github: githubTraffic,
  };
}
