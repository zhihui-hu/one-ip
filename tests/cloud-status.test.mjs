import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import worker from "../.worker-test/index.js";
import {
  parseDmit,
  parseGoogleCloud,
  parseAws,
  parseBandwagon,
  getCloudStatus,
} from "../public/worker/cloud-status.js";

const services = JSON.parse(readFileSync("public/worker/services.json"));
test("VPS and major cloud catalogs match and use official destinations", () => {
  assert.deepEqual(
    services,
    JSON.parse(readFileSync("src/views/status/services.json")),
  );
  assert.equal(new Set(services.map((s) => s.id)).size, services.length);
  for (const id of [
    "dmit",
    "bandwagonhost",
    "aws",
    "aliyun",
    "tencent-cloud",
    "google-cloud",
    "azure",
    "oracle-cloud",
  ])
    assert.equal(services.find((s) => s.id === id).officialStatus, true);
  assert.equal(
    services.find((s) => s.id === "bandwagonhost").page,
    "https://bwhstatus.com/",
  );
});

test("DMIT normalizes the summary and preserves per-location components", () => {
  const result = parseDmit({
    status: "degraded",
    services: [
      { slug: "lax", group: "lax", name: "Backbone", status: "degraded" },
    ],
  });
  assert.equal(result.status.indicator, "minor");
  assert.equal(result.components[0].status, "degraded_performance");
  assert.equal(result.components[0].name, "lax / Backbone");
  assert.equal(result.incidents, undefined);
  assert.throws(() => parseDmit({ status: "unexpected", services: [] }));
});

test("Google excludes resolved history and keeps ongoing incidents", () => {
  const event = {
    id: "test",
    begin: "2026-09-11T00:00:00Z",
    external_desc: "Network issue",
    severity: "high",
  };
  assert.equal(
    parseGoogleCloud([{ ...event, end: "2026-09-11T01:00:00Z" }]).status
      .indicator,
    "none",
  );
  assert.equal(parseGoogleCloud([event]).status.indicator, "major");
  assert.equal(parseGoogleCloud([event]).incidents.length, 1);
  assert.throws(() => parseGoogleCloud({}));
  assert.throws(() => parseGoogleCloud([{}]));
});

test("AWS ignores resolved entries and does not expire long-running disruptions", () => {
  const event = {
    arn: "test",
    date: "1700000000",
    status: "3",
    service_name: "EC2",
    region_name: "UAE",
    summary: "Errors",
    event_log: [{ timestamp: 1700000500 }, { timestamp: 1700000300 }],
  };
  assert.equal(parseAws([{ ...event, status: "0" }]).status.indicator, "none");
  const result = parseAws([event]);
  assert.equal(result.status.indicator, "major");
  assert.equal(
    result.incidents[0].updated_at,
    new Date(1700000500000).toISOString(),
  );
  assert.throws(() => parseAws([{ ...event, status: "new" }]));
});

test("Bandwagon reads the summary, not historical incident text, and rejects changed markup", () => {
  const page =
    '<title>BandwagonHost Status</title><h1>All systems operational</h1><span class="summary summary-ok"> Operational </span><p>Previous outage</p>';
  assert.equal(parseBandwagon(page).status.indicator, "none");
  assert.equal(
    parseBandwagon(page.replace("Operational </span>", "Maintenance </span>"))
      .status.indicator,
    "maintenance",
  );
  assert.throws(() => parseBandwagon("<title>Challenge</title>"));
  assert.throws(() =>
    parseBandwagon(page.replace("Operational </span>", "Unexpected </span>")),
  );
});

test("AWS fetch decodes UTF-16BE JSON and route returns normalized status", async (t) => {
  const text = JSON.stringify([]);
  const bytes = new Uint8Array(2 + text.length * 2);
  bytes.set([0xfe, 0xff]);
  for (let i = 0; i < text.length; i++) bytes[3 + i * 2] = text.charCodeAt(i);
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(options.redirect, "manual");
    assert.equal(url, "https://health.aws.amazon.com/public/currentevents");
    return new Response(bytes);
  });
  const response = await worker.fetch(
    new Request("https://example.com/api/status/aws"),
    {},
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status.indicator, "none");
});

test("provider failures never report healthy", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("blocked", { status: 403 }),
  );
  await assert.rejects(
    getCloudStatus(services.find((s) => s.id === "bandwagonhost")),
  );
  for (const id of ["aliyun", "tencent-cloud", "azure"])
    assert.equal(
      (
        await worker.fetch(
          new Request(`https://example.com/api/status/${id}`),
          {},
        )
      ).status,
      502,
    );
});
