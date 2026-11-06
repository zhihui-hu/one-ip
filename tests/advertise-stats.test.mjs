import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cloudflareVariables,
  summarizeCloudflare,
} from "../worker/advertise.js";

const hour = 3_600_000;
const group = (uniques, requests, bytes, cachedBytes, countryMap) => [
  {
    uniq: { uniques },
    sum: { requests, pageViews: requests / 20, bytes, cachedBytes, countryMap },
  },
];

test("Cloudflare windows follow Beijing days and the 3-day hourly limit", () => {
  // 2026-11-05 23:30 Beijing, the widest 3-day window of the day.
  const now = Date.parse("2026-11-05T15:30:00Z");
  const v = cloudflareVariables("zone", now);
  assert.equal(v.end, "2026-11-05T16:00:00.000Z");
  assert.equal(v.h24, "2026-11-04T16:00:00.000Z");
  assert.equal(v.today, "2026-11-04T16:00:00.000Z");
  assert.equal(v.yesterday, "2026-11-03T16:00:00.000Z");
  assert.ok(Date.parse(v.end) - Date.parse(v.d3) <= 3 * 24 * hour);
  assert.ok(Date.parse(v.end) - Date.parse(v.hourly) <= 3 * 24 * hour);
  assert.equal(v.dFrom, "2026-10-07");
  assert.equal(v.dTo, "2026-11-05");
});

test("Cloudflare summary keeps dashboard totals, fills hours and ranks countries", () => {
  const now = Date.parse("2026-11-05T04:30:00Z");
  const lastHour = "2026-11-05T04:00:00Z";
  const summary = summarizeCloudflare(
    {
      last24h: group(1220, 54_200, 336e6, 238e6),
      today: group(450, 15_000, 95e6, 71e6),
      yesterday: group(1202, 52_982, 335e6, 238e6),
      last3d: group(2555, 118_621, 915e6, 626e6),
      last30d: group(31_186, 1_440_742, 8884e6, 5178e6, [
        { clientCountryName: "JP", requests: 20 },
        { clientCountryName: "US", requests: 50 },
        { clientCountryName: "XX", requests: 99 },
      ]),
      hourly: [{ dimensions: { datetime: lastHour }, uniq: { uniques: 86 } }],
      daily: [{ dimensions: { date: "2026-11-05" }, uniq: { uniques: 1192 } }],
    },
    now,
  );
  assert.deepEqual(summary.ranges.last24h, {
    uniques: 1220,
    requests: 54_200,
    pageViews: 2710,
    bytes: 336e6,
    cachedBytes: 238e6,
  });
  assert.equal(summary.ranges.last30d.uniques, 31_186);
  assert.equal(summary.hourly.length, 72);
  assert.equal(summary.hourly.at(-1).time, "2026-11-05T04:00:00.000Z");
  assert.equal(summary.hourly.at(-1).uniques, 86);
  assert.equal(summary.hourly[0].uniques, 0);
  assert.equal(summary.daily.length, 1);
  assert.equal(summary.daily[0].date, "2026-11-05");
  assert.equal(summary.daily[0].uniques, 1192);
  assert.equal(summary.daily[0].pageViews, 0);
  assert.deepEqual(
    summary.countries.map((item) => item.country),
    ["US", "JP"],
  );
});

test("missing groups count as zero", () => {
  const summary = summarizeCloudflare(
    {
      last24h: [],
      today: [],
      yesterday: [],
      last3d: [],
      last30d: [],
      hourly: [],
      daily: [],
    },
    Date.now(),
  );
  assert.equal(summary.ranges.today.requests, 0);
  assert.deepEqual(summary.countries, []);
});
