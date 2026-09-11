import assert from "node:assert/strict";
import { test } from "node:test";
import { parseGrokFeed } from "../public/worker/ai-status.js";

const feed = (items) => `<rss version="2.0"><channel>${items}</channel></rss>`;
const item = (state) =>
  `<item><title>Grok &amp; API</title><guid>incident-1</guid><link>https://status.x.ai/grok-com/incident-1</link><description><![CDATA[<h3>Status: ${state.toUpperCase()}</h3><h4>Updates:</h4><strong>Thu, 10 Sep 2026 07:15:52 GMT</strong><h3>Investigating</h3>]]></description><pubDate>Thu, 10 Sep 2026 07:03:52 GMT</pubDate><category>${state}</category></item>`;
test("Grok RSS ignores historical investigation text in resolved events", () => {
  assert.deepEqual(parseGrokFeed(feed(item("resolved"))).incidents, []);
});
test("Grok RSS reports active incidents with latest update time and decoded titles", () => {
  const result = parseGrokFeed(feed(item("investigating")));
  assert.equal(result.status.indicator, "minor");
  assert.equal(result.incidents[0].name, "Grok & API");
  assert.equal(result.incidents[0].updated_at, "2026-09-10T07:15:52.000Z");
});
test("Grok RSS rejects error pages, truncated items and unrecognized states", () => {
  for (const xml of [
    "<html>Blocked</html>",
    feed("<item>"),
    feed(item("unexpected")),
  ])
    assert.throws(() => parseGrokFeed(xml));
});

test("Worker reads both official RSS URLs and returns normalized status", async (t) => {
  const { default: worker } = await import("../.worker-test/index.js");
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    calls.push(url);
    if (url === "https://status.x.ai/feed.xml")
      return new Response(feed(item("resolved")));
    assert.equal(url, "https://status.deepseek.com/feed.rss");
    return new Response(
      "<rss><channel><item><title>Recovered</title><description>&lt;p&gt;&lt;strong&gt;Status:&lt;/strong&gt; resolved&lt;/p&gt;</description></item></channel></rss>",
    );
  });
  for (const id of ["33", "32"]) {
    const result = await worker.fetch(
      new Request(`https://example.com/api/status/${id}`),
      {},
    );
    assert.equal(result.status, 200);
    assert.equal((await result.json()).status.indicator, "none");
  }
  assert.equal(calls.length, 2);
});
