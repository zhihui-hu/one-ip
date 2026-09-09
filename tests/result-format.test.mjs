import assert from "node:assert/strict";
import { test } from "node:test";
import {
  moduleReport,
  fingerprintSummary,
  parseDetail,
  valueText,
} from "../src/views/browser/result-format.ts";

test("unavailable data is never interpreted as a clean detection", () => {
  const result = moduleReport("canvas", null);
  assert.equal(result.unavailable, true);
  assert.equal(result.status, "无法检测");
  assert.equal(moduleReport("canvas", {}).status, "已读取");
  assert.equal(moduleReport("canvas", { lied: false }).status, "未发现差异");
  assert.equal(moduleReport("canvas", { lied: true }).signal, true);
});
test("only true headless flags count as signals, not ratings or false values", () => {
  const result = moduleReport("headless", {
    headless: { webDriverIsOn: false, hasHeadlessUA: true },
    likeHeadless: { noPlugins: true },
    stealth: { hasBadChromeRuntime: null },
    headlessRating: 99,
  });
  assert.equal(result.issues.length, 2);
  assert.ok(result.issues.includes("UA 含 Headless 标记"));
  assert.equal(
    moduleReport("headless", { headless: { webDriverIsOn: false } }).signal,
    false,
  );
});
test("prototype anomalies and collection errors remain separate", () => {
  assert.equal(moduleReport("prototypeLies", {}).signal, false);
  assert.equal(
    moduleReport("prototypeLies", {
      "Navigator.language": ["unexpected descriptor"],
    }).issues.length,
    1,
  );
  assert.equal(
    moduleReport("lies", {
      data: { "Navigator.language": ["mismatch"] },
      totalLies: 1,
    }).signal,
    true,
  );
  assert.equal(
    moduleReport("errors", { data: [{ trustedName: "TypeError" }] }).status,
    "存在读取错误",
  );
  assert.equal(moduleReport("errors", { data: [{}] }).signal, false);
});
test("fingerprint summaries show values rather than hashes", () => {
  assert.equal(
    fingerprintSummary("screenResolution", [1920, 1080]),
    "1920 × 1080",
  );
  assert.equal(fingerprintSummary("deviceMemory", 8), "8 GB（近似值）");
  assert.match(fingerprintSummary("fonts", ["Arial", "Helvetica"]), /2 种字体/);
  assert.equal(valueText(false), "否");
  assert.equal(valueText(null), "未提供");
  assert.equal(parseDetail("false"), false);
  assert.equal(parseDetail("无法检测"), "无法检测");
});
