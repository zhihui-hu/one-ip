import assert from "node:assert/strict";
import { test } from "node:test";
import {
  statusBatchSize,
  statusLoadBatch,
  statusLoadIds,
} from "../src/views/status/loading.ts";
import services from "../src/views/status/services.json" with { type: "json" };

test("status page initially enables a small batch on the all filter", () => {
  const ids = statusLoadIds(services, "全部", null, 0);
  assert.equal(ids.size, statusBatchSize);
  assert.deepEqual(
    [...ids],
    services
      .filter((service) => service.url)
      .slice(0, statusBatchSize)
      .map((service) => service.id),
  );
});

test("status page enables the current group and detail service on demand", () => {
  const ids = statusLoadIds(services, "AI", "0", 0);
  assert.equal(ids.has("0"), true);
  assert.deepEqual(
    [...ids].filter((id) => id !== "0").sort(),
    services
      .filter((service) => service.url && service.group === "AI")
      .map((service) => service.id)
      .sort(),
  );
});

test("status page batches eventually cover every integrated service", () => {
  const integrated = services.filter((service) => service.url);
  const finalBatch = Math.ceil(integrated.length / statusBatchSize) - 1;
  const ids = statusLoadIds(services, "全部", null, finalBatch);
  assert.equal(ids.size, integrated.length);
});

test("status page advances only past completed batches", () => {
  const integrated = services.filter((service) => service.url);
  const complete = new Set(
    integrated.slice(0, statusBatchSize).map((s) => s.id),
  );

  assert.equal(
    statusLoadBatch(services, (service) => complete.has(service.id)),
    1,
  );
  complete.add(integrated[statusBatchSize].id);
  assert.equal(
    statusLoadBatch(services, (service) => complete.has(service.id)),
    1,
  );
});
