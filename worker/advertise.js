// Public traffic figures for the advertising page. Tokens stay in the Worker;
// only aggregated numbers are returned.

const hourMs = 3_600_000;
const dayMs = 24 * hourMs;
// Site figures are reported in Beijing time.
const offsetMs = 8 * hourMs;
const defaultRepos = "zhihui-hu/one-ip";

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

// The hourly/daily datasets behind the dashboard's zone overview (Unique
// Visitors, Total Requests, Percent Cached, Data Served, Data Cached).
// Aggregating without a dimension deduplicates visitors across the whole
// window. Hourly data reaches back about 3 days; 30 days use UTC dates.
const fields = "sum { requests pageViews bytes cachedBytes } uniq { uniques }";
const hourGroup = (name, from, to) =>
  `${name}: httpRequests1hGroups(limit: 1, filter: { datetime_geq: $${from}, datetime_lt: $${to} }) { ${fields} }`;
const cloudflareQuery = `query ($zone: String!, $end: Time!, $h24: Time!, $today: Time!, $yesterday: Time!, $d3: Time!, $hourly: Time!, $dFrom: Date!, $dTo: Date!) {
  viewer {
    zones(filter: { zoneTag: $zone }) {
      ${hourGroup("last24h", "h24", "end")}
      ${hourGroup("today", "today", "end")}
      ${hourGroup("yesterday", "yesterday", "today")}
      ${hourGroup("last3d", "d3", "end")}
      last30d: httpRequests1dGroups(limit: 1, filter: { date_geq: $dFrom, date_leq: $dTo }) {
        sum { requests pageViews bytes cachedBytes countryMap { clientCountryName requests } }
        uniq { uniques }
      }
      hourly: httpRequests1hGroups(limit: 100, filter: { datetime_geq: $hourly, datetime_lt: $end }, orderBy: [datetime_ASC]) { dimensions { datetime } ${fields} }
      daily: httpRequests1dGroups(limit: 40, filter: { date_geq: $dFrom, date_leq: $dTo }, orderBy: [date_ASC]) { dimensions { date } ${fields} }
    }
  }
}`;

export function cloudflareVariables(zone, now) {
  const end = Math.floor(now / hourMs) * hourMs + hourMs;
  const today = beijingMidnight(now);
  const iso = (ms) => new Date(ms).toISOString();
  const date = (ms) => iso(ms).slice(0, 10);
  return {
    zone,
    end: iso(end),
    h24: iso(end - dayMs),
    today: iso(today),
    yesterday: iso(today - dayMs),
    d3: iso(today - 2 * dayMs),
    hourly: iso(end - 3 * dayMs),
    dFrom: date(now - 29 * dayMs),
    dTo: date(now),
  };
}

const metrics = (row) => ({
  uniques: row?.uniq?.uniques ?? 0,
  requests: row?.sum?.requests ?? 0,
  pageViews: row?.sum?.pageViews ?? 0,
  bytes: row?.sum?.bytes ?? 0,
  cachedBytes: row?.sum?.cachedBytes ?? 0,
});

export function summarizeCloudflare(result, now) {
  const end = Math.floor(now / hourMs) * hourMs + hourMs;
  const byHour = new Map(
    result.hourly.map((row) => [Date.parse(row.dimensions.datetime), row]),
  );
  const hourly = [];
  for (let start = end - 3 * dayMs; start < end; start += hourMs)
    hourly.push({
      time: new Date(start).toISOString(),
      ...metrics(byHour.get(start)),
    });
  const countries = (result.last30d?.[0]?.sum.countryMap ?? [])
    // XX is Cloudflare's "unknown"; T1 (Tor) fails the pattern anyway.
    .filter(
      (item) =>
        /^[A-Z]{2}$/.test(item.clientCountryName) &&
        item.clientCountryName !== "XX",
    )
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 12)
    .map((item) => ({
      country: item.clientCountryName,
      requests: item.requests,
    }));
  return {
    ranges: {
      last24h: metrics(result.last24h?.[0]),
      today: metrics(result.today?.[0]),
      yesterday: metrics(result.yesterday?.[0]),
      last3d: metrics(result.last3d?.[0]),
      last30d: metrics(result.last30d?.[0]),
    },
    hourly,
    daily: result.daily.map((row) => ({
      date: row.dimensions.date,
      ...metrics(row),
    })),
    countries,
  };
}

async function cloudflareStats(env, now) {
  const token = env.CLOUDFLARE_ANALYTICS_TOKEN?.trim();
  const zone = env.CLOUDFLARE_ZONE_ID?.trim();
  if (!token || !zone) return unavailable("not-configured");
  try {
    const data = await graphql(
      token,
      cloudflareQuery,
      cloudflareVariables(zone, now),
    );
    const result = data.viewer.zones[0];
    if (!result) return unavailable("no-access");
    return { available: true, ...summarizeCloudflare(result, now) };
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
  // Referrers are deliberately not fetched: listing them would advertise
  // other sites on the advertising page.
  const [info, views, clones] = await Promise.all([
    github(token, `repos/${repo}`),
    github(token, `repos/${repo}/traffic/views`),
    github(token, `repos/${repo}/traffic/clones`),
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
