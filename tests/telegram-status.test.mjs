import assert from "node:assert/strict";
import { test } from "node:test";
import { getAiStatus } from "../public/worker/ai-status.js";
import { parseTelegramStatus } from "../public/worker/telegram-status.js";

const now = Date.parse("2026-09-12T15:15:00Z");
const sample = {
  slug: "telegram",
  url: "telegram.org",
  status: "UP",
  lastCheck: "2026-09-12T15:09:50Z",
};
test("Telegram website monitoring maps UP/DOWN without inventing messaging incidents", () => {
  const up = parseTelegramStatus(sample, now);
  assert.equal(up.status.indicator, "none");
  assert.equal(up.checkedAt, sample.lastCheck.replace("Z", ".000Z"));
  assert.equal(up.incidents, undefined);
  assert.equal(
    parseTelegramStatus({ ...sample, status: "DOWN" }, now).status.indicator,
    "major",
  );
});
test("Telegram missing, unknown, wrong-target and stale data cannot appear healthy", () => {
  for (const value of [
    null,
    {},
    { ...sample, status: "PAUSED" },
    { ...sample, slug: "other" },
    { ...sample, url: "other.org" },
    { ...sample, lastCheck: "invalid" },
    { ...sample, lastCheck: "2026-09-12T14:00:00Z" },
    { ...sample, lastCheck: "2026-09-13T15:00:00Z" },
  ])
    assert.throws(
      () => parseTelegramStatus(value, now),
      (e) => e.status === 502,
    );
});
test("Telegram adapter reads the third-party feed and propagates upstream failures", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url) => {
      assert.equal(url, "https://uptimerobot.com/api/pulse/monitors/telegram");
      return Response.json({ ...sample, lastCheck: new Date().toISOString() });
    };
    const service = {
      id: "telegram",
      url: "https://uptimerobot.com/api/pulse/monitors/telegram",
    };
    assert.equal((await getAiStatus(service)).status.indicator, "none");
    globalThis.fetch = async () => new Response("unavailable", { status: 503 });
    await assert.rejects(
      () => getAiStatus(service),
      (e) => e.status === 502,
    );
  } finally {
    globalThis.fetch = original;
  }
});
