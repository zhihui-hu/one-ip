import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { getAiStatus, parseDeepSeek, parseGemini } from "../public/worker/ai-status.js";

const deepFeed = (state) => `<rss><channel><item><title>API issue</title><guid>event-1</guid><link>https://status.deepseek.com/incidents/1</link><description>&lt;p&gt;&lt;strong&gt;Status:&lt;/strong&gt; ${state}&lt;/p&gt;</description></item></channel></rss>`;
test("DeepSeek RSS reads explicit status and excludes resolved events", () => {
  for (const state of ["resolved", "scheduled", "completed", "cancelled"]) assert.equal(parseDeepSeek(deepFeed(state)).status.indicator, "none");
  assert.equal(parseDeepSeek(deepFeed("investigating")).status.indicator, "minor");
  assert.equal(parseDeepSeek(deepFeed("ongoing")).status.indicator, "maintenance");
  assert.throws(() => parseDeepSeek("<html>Unavailable</html>"));
  assert.throws(() => parseDeepSeek(deepFeed("unexpected")));
});
test("Gemini uses the latest timestamp, not array order, to determine resolution", () => {
  const row = ["test", "API unavailable", 1, [[4, "", ["200"]], [1, "", ["100"]]]];
  assert.equal(parseGemini([[[row]]]).status.indicator, "none");
  row[3].push([1, "", ["300"]]);
  const result = parseGemini([[[row]]]);
  assert.equal(result.status.indicator, "minor");
  assert.equal(result.incidents[0].updated_at, new Date(300000).toISOString());
  assert.throws(() => parseGemini({}));
  assert.throws(() => parseGemini([[[["test", "bad", 1, []]]]]));
});
test("Gemini reads public page identifiers and retries the status API without exposing credentials", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    if (calls === 1) return new Response('AIzaPublicFirst AIzaPublicSecond');
    assert.equal(init.method, "POST");
    assert.equal(init.headers.Referer, "https://aistudio.google.com/");
    if (calls === 2) return new Response(null, { status: 403 });
    return Response.json([[[]]]);
  };
  try {
    assert.equal((await getAiStatus({ id: "31", page: "https://aistudio.google.com/status", url: "https://example.com/status" })).status.indicator, "none");
    assert.equal(calls, 3);
  } finally { globalThis.fetch = original; }
});
test("browser and Worker share the same verified AI status sources", () => {
  const web = JSON.parse(readFileSync('src/views/status/services.json'));
  const worker = JSON.parse(readFileSync('public/worker/services.json'));
  assert.deepEqual(web, worker);
  for (const id of ['31','32','35']) assert.ok(web.find(s => s.id === id).url);
  assert.equal(web.find(s => s.id === '35').page, 'https://status.moonshot.cn');
});
