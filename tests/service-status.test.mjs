import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeStatus } from "../public/worker/service-status.js";
test("Instatus UP and future maintenance stay operational", () => {
  const result = normalizeStatus({ page: { status: "UP" }, activeMaintenances: [{ status: "NOTSTARTEDYET" }] });
  assert.equal(result.status.indicator, "none");
  assert.deepEqual(result.incidents, []);
});
test("Instatus active incidents and maintenance are normalized", () => {
  const result = normalizeStatus({ page: { status: "UNDERMAINTENANCE" }, activeMaintenances: [{ id: "1", name: "Maintenance", status: "INPROGRESS", updatedAt: "2026-09-09T00:00:00Z" }] });
  assert.equal(result.status.indicator, "maintenance");
  assert.equal(result.incidents[0].updated_at, "2026-09-09T00:00:00Z");
  assert.equal(normalizeStatus({ page: { status: "HASISSUES" } }).status.indicator, "minor");
});
test("existing Statuspage and unknown schemas are preserved", () => {
  for (const data of [{ status: { indicator: "critical" } }, { page: { status: "NEW" } }]) assert.equal(normalizeStatus(data), data);
});
