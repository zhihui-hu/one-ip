import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeCloudflare } from "../worker/advertise.js";

const hour = 3_600_000;
const row = (ms, visits, requests = visits * 10) => ({
  dimensions: { datetimeHour: new Date(ms).toISOString() },
  sum: { visits, edgeResponseBytes: visits * 100 },
  count: requests,
});

test("Cloudflare ranges follow Beijing calendar days", () => {
  // 2026-11-05 12:30 Beijing = 04:30 UTC.
  const now = Date.parse("2026-11-05T04:30:00Z");
  const todayStart = Date.parse("2026-11-04T16:00:00Z");
  const rows = [
    row(todayStart + 2 * hour, 5), // today
    row(todayStart - 1 * hour, 7), // yesterday 23:00 Beijing
    row(todayStart - 30 * hour, 11), // two days ago
    row(todayStart - 20 * 24 * hour, 13), // inside 30 days
  ];
  const { ranges, days, hourly } = summarizeCloudflare(rows, now);
  assert.equal(ranges.today.visits, 5);
  assert.equal(ranges.yesterday.visits, 7);
  assert.equal(ranges.last24h.visits, 12);
  assert.equal(ranges.last3d.visits, 23);
  assert.equal(ranges.last30d.visits, 36);
  assert.equal(ranges.last30d.requests, 360);
  assert.equal(ranges.last30d.bytes, 3600);
  assert.equal(days.length, 30);
  assert.equal(days.at(-1).date, "2026-11-05");
  assert.equal(days.at(-1).visits, 5);
  assert.equal(days.at(-2).visits, 7);
  assert.equal(hourly.length, 72);
});
