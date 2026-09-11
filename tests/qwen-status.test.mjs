import assert from "node:assert/strict";
import { test } from "node:test";
import worker from "../.worker-test/index.js";
import { parseQwenStatus } from "../public/worker/cloud-status.js";

const catalog = {
  success: true,
  data: [{ productList: [{ productId: "sfm" }] }],
};
const current = (productStatus = {}, eventDetails = {}) => ({
  success: true,
  data: [{ productStatus, eventDetails }],
});
test("Qwen uses only registered Model Studio status, excluding unrelated Alibaba incidents", () => {
  assert.equal(
    parseQwenStatus(
      catalog,
      current({ ecs: [{ eventId: 1 }] }, { 1: { eventType: "ALARM" } }),
    ).status.indicator,
    "none",
  );
  const event = {
    id: 2,
    title: "Model API degraded",
    eventType: "ALARM",
    startTime: 1,
  };
  assert.equal(
    parseQwenStatus(catalog, current({ sfm: [{ eventId: 2 }] }, { 2: event }))
      .status.indicator,
    "major",
  );
  assert.throws(() => parseQwenStatus({ success: true, data: [] }, current()));
  assert.throws(() => parseQwenStatus(catalog, { success: true, data: [] }));
  assert.throws(() =>
    parseQwenStatus(catalog, current({ sfm: [{ eventId: 2 }] })),
  );
});
test("Qwen Worker route queries the official non-regional product and current state endpoints", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.match(url, /^https:\/\/status.aliyun.com\/api\/status\//);
    assert.equal(new URL(url).searchParams.get("regionId"), "non-regional");
    return Response.json(
      url.includes("listProductForAllTypeInRegion") ? catalog : current(),
    );
  });
  const response = await worker.fetch(
    new Request("https://example.com/api/status/34"),
    {},
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).components[0].id, "sfm");
});
