import assert from "node:assert/strict";
import { test } from "node:test";
import { request } from "../src/lib/network.ts";

for (const phase of ["connection", "body"]) {
  test(`request settles on abort even when ${phase} ignores cancellation`, async () => {
    const original = globalThis.fetch;
    const controller = new AbortController();
    globalThis.fetch = async () => phase === "connection"
      ? new Promise(() => {})
      : { ok: true, json: () => new Promise(() => {}) };
    const timer = setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), 20);
    try {
      await assert.rejects(request("https://example.test", { signal: controller.signal }), { name: "TimeoutError" });
    } finally {
      clearTimeout(timer);
      globalThis.fetch = original;
    }
  });
}

test("already cancelled requests do not start a fetch", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => { assert.fail("fetch must not run"); };
  try {
    await assert.rejects(request("https://example.test", { signal: AbortSignal.abort() }), { name: "AbortError" });
  } finally { globalThis.fetch = original; }
});
