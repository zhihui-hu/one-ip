import assert from "node:assert/strict";
import { test } from "node:test";
import { createConcurrencyLimiter } from "../src/lib/network.ts";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("concurrency limiter bounds active diagnostic operations and releases failures", async () => {
  const limiter = createConcurrencyLimiter(2);
  let active = 0;
  let peak = 0;
  const run = (value, delay, fail = false) =>
    limiter.run(undefined, async () => {
      active += 1;
      peak = Math.max(peak, active);
      await wait(delay);
      active -= 1;
      if (fail) throw new Error("expected");
      return value;
    });

  const result = await Promise.allSettled([
    run("a", 10),
    run("b", 10, true),
    run("c", 1),
    run("d", 1),
  ]);
  assert.equal(peak, 2);
  assert.deepEqual(
    result.map((item) => item.status),
    ["fulfilled", "rejected", "fulfilled", "fulfilled"],
  );
  assert.equal(limiter.active, 0);
  assert.equal(limiter.pending, 0);
});

test("queued work is cancelled before it starts", async () => {
  const limiter = createConcurrencyLimiter(1);
  const controller = new AbortController();
  let started = 0;
  const first = limiter.run(undefined, async () => {
    started += 1;
    await wait(15);
    return "first";
  });
  const second = limiter.run(controller.signal, async () => {
    started += 1;
    return "second";
  });
  const secondRejection = assert.rejects(second, { name: "AbortError" });
  controller.abort();
  assert.equal(await first, "first");
  await secondRejection;
  assert.equal(started, 1);
  assert.equal(limiter.pending, 0);
});

test("higher priority queued work runs before older low priority work", async () => {
  const limiter = createConcurrencyLimiter(1);
  const order = [];
  const first = limiter.run(undefined, async () => {
    order.push("first");
    await wait(10);
  });
  const low = limiter.run(undefined, async () => order.push("low"), 0);
  const high = limiter.run(undefined, async () => order.push("high"), 10);
  await Promise.all([first, low, high]);
  assert.deepEqual(order, ["first", "high", "low"]);
});
