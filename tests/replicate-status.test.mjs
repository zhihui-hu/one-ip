import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseReplicate, getAiStatus } from "../public/worker/ai-status.js";

const component = {
  id: "fvgfcmy66tdr",
  name: "Replicate",
  status: "operational",
};
const data = (extra = {}) => ({
  status: { indicator: "major" },
  components: [component],
  incidents: [],
  scheduled_maintenances: [],
  ...extra,
});
test("Replicate is isolated from unrelated Cloudflare outages", () => {
  const result = parseReplicate(
    data({
      incidents: [
        {
          id: "workers",
          status: "identified",
          components: [{ id: "workers" }],
        },
      ],
    }),
  );
  assert.equal(result.status.indicator, "none");
  assert.deepEqual(result.incidents, []);
  assert.deepEqual(result.components, [component]);
});
test("Replicate includes its active incidents and maintenance but excludes resolved or future events", () => {
  const event = { id: "event", status: "monitoring", components: [component] };
  const result = parseReplicate(
    data({
      incidents: [event, { ...event, id: "resolved", status: "resolved" }],
      scheduled_maintenances: [{ ...event, status: "scheduled" }],
    }),
  );
  assert.deepEqual(result.incidents, [event]);
  assert.equal(
    parseReplicate(
      data({ scheduled_maintenances: [{ ...event, status: "in_progress" }] }),
    ).status.indicator,
    "maintenance",
  );
  assert.equal(
    parseReplicate(
      data({ components: [{ ...component, status: "major_outage" }] }),
    ).status.indicator,
    "major",
  );
  assert.throws(() => parseReplicate(data({ components: [] })));
  assert.throws(() =>
    parseReplicate(data({ components: [{ ...component, status: "new" }] })),
  );
});
test("migrated AI services use verified JSON endpoints", async (t) => {
  const services = JSON.parse(readFileSync("public/worker/services.json"));
  assert.equal(
    services.find((s) => s.id === "10").url,
    "https://status.perplexity.com/api/v2/summary.json",
  );
  t.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url, "https://www.cloudflarestatus.com/api/v2/summary.json");
    assert.match(init.headers["User-Agent"], /One-IP/);
    return Response.json(data());
  });
  assert.equal(
    (await getAiStatus(services.find((s) => s.id === "11"))).status.indicator,
    "none",
  );
});
