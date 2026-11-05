import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { resolveLocale, t } from "../src/i18n/index.ts";
import { localizeApiMessage } from "../src/i18n/api-message.ts";
import { messages } from "../src/i18n/messages.ts";

const en = messages.en;
const zh = messages["zh-CN"];
test("saved language wins; browser language supplies a safe default", () => {
  assert.equal(resolveLocale("en", ["zh-CN"]), "en");
  assert.equal(resolveLocale("zh-CN", ["en-US"]), "zh-CN");
  assert.equal(resolveLocale(null, ["zh-TW"]), "zh-CN");
  assert.equal(resolveLocale("invalid", ["fr-FR"]), "en");
  assert.equal(resolveLocale(null, []), "en");
});
test("interpolation leaves user values intact", () => {
  assert.equal(t("api.requestFailed", [503]), "请求失败 (503)");
  assert.equal(t("api.requestFailed", ["{1} <script>"]), "请求失败 ({1} <script>)");
});
test("all literal translation calls have English entries and matching placeholders", () => {
  function scan(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) { scan(file); continue; }
      if (!/\.tsx?$/.test(file)) continue;
      const source = readFileSync(file, "utf8");
      const calls = /\bt\(\s*"((?:\\.|[^"\\])*)"/g;
      for (const match of source.matchAll(calls)) {
        const key = JSON.parse(`"${match[1]}"`);
        assert.ok(en[key], `${file}: missing ${key}`);
        assert.deepEqual(en[key].match(/\{\d+\}/g)?.sort() ?? [], zh[key].match(/\{\d+\}/g)?.sort() ?? [], key);
      }
    }
  }
  scan("src");
});

test("English runtime translates messages and switches with blocked storage without losing route state", async () => {
  let destination;
  globalThis.window = { location: { href: "https://example.test/status?group=AI&lang=en#details", assign: (url) => { destination = url; } } };
  globalThis.localStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  try {
    const runtime = await import("../src/i18n/index.ts?english-test");
    assert.equal(runtime.locale, "en");
    assert.equal(runtime.t("navigation.serviceStatus"), "Service status");
    assert.equal(runtime.t("api.requestFailed", [503]), "Request failed (503)");
    assert.equal(runtime.t("api.upstreamUnavailable", [502]), "Upstream source unavailable (502)");
    assert.equal(localizeApiMessage("Untranslated upstream text"), "Untranslated upstream text");
    runtime.setLocale("zh-CN");
    assert.equal(destination, "https://example.test/status?group=AI&lang=zh-CN#details");
  } finally {
    delete globalThis.window;
    delete globalThis.localStorage;
  }
});
