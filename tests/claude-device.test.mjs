import assert from "node:assert/strict";
import { test } from "node:test";
import { matchEnvironment, probeFonts, pixelSummary, collectDeviceSignals } from "../src/views/claude/device-signals.ts";

test("language and device matches preserve observed signals without inferring nationality", () => {
  const result = matchEnvironment("MicroMessenger HarmonyOS", "Asia/Shanghai", ["en-US", "zh-CN"]);
  assert.equal(result.timezoneMatch, true);
  assert.deepEqual(result.chineseLanguages, ["zh-CN"]);
  assert.ok(result.browsers.includes("WeChat"));
  assert.ok(result.devices.includes("HarmonyOS"));
  assert.equal(matchEnvironment("Safari", "Asia/Singapore", ["en-US"]).timezoneMatch, false);
  assert.equal(matchEnvironment("Safari", "Asia/Taipei", ["zh-TW"]).timezoneMatch, false);
});

test("font detection compares fallback widths and reports only distinct metrics", () => {
  const ctx = { font: "", measureText() { return { width: this.font.includes('"DengXian"') ? 110 : 100 }; } };
  assert.deepEqual(probeFonts(ctx, ["DengXian", "AbsentFont"]), ["DengXian"]);
});

test("pixel detection distinguishes blank, grayscale and colored output", () => {
  assert.equal(pixelSummary(new Uint8ClampedArray([255, 0, 0, 0])).kind, "empty");
  assert.equal(pixelSummary(new Uint8ClampedArray([90, 90, 90, 255])).kind, "monochrome");
  assert.equal(pixelSummary(new Uint8ClampedArray([250, 20, 20, 255])).kind, "color");
});

test("blocked Canvas stays unavailable and device checks make no network requests", async () => {
  const previous = globalThis.document;
  const fetch = globalThis.fetch;
  globalThis.document = { createElement: () => ({ getContext() { throw new Error("blocked"); } }) };
  globalThis.fetch = () => { throw new Error("device checks must stay local"); };
  try {
    const result = await collectDeviceSignals(new AbortController().signal);
    assert.equal(result.fonts, undefined);
    assert.equal(result.emojis, undefined);
    const controller = new AbortController(); controller.abort();
    await assert.rejects(collectDeviceSignals(controller.signal), { name: "AbortError" });
  } finally { globalThis.document = previous; globalThis.fetch = fetch; }
});
