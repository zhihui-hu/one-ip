import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatBytes,
  formatCount,
  formatPercent,
} from "../src/views/advertise/format.ts";

test("counts match the Cloudflare dashboard style", () => {
  assert.equal(formatCount(0), "0");
  assert.equal(formatCount(999), "999");
  assert.equal(formatCount(1250), "1.25k");
  assert.equal(formatCount(1220), "1.22k");
  assert.equal(formatCount(55_340), "55.34k");
  assert.equal(formatCount(381_730), "381.73k");
  assert.equal(formatCount(1_451_590), "1.45M");
  assert.equal(formatCount(999_999), "1M");
  assert.equal(formatCount(2_500_000_000), "2.5B");
});

test("data sizes keep three significant digits", () => {
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(341e6), "341 MB");
  assert.equal(formatBytes(23.77e6), "23.8 MB");
  assert.equal(formatBytes(2.65e9), "2.65 GB");
  assert.equal(formatBytes(7.4e9), "7.40 GB");
  assert.equal(formatBytes(999.7e6), "1.00 GB");
});

test("percentages round to whole numbers", () => {
  assert.equal(formatPercent(70.97), "71%");
});
