import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { t } from "../src/i18n/index.ts";

const source = ts.transpileModule(readFileSync("src/views/ping/api.ts", "utf8").replace('import { t } from "@/i18n";', '').replace('import { endpoint } from "@/lib/network";', ''), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const createRunner = new Function("t", "endpoint", "setTimeout", source.replaceAll("export ", "") + "\nreturn runPing;").bind(null, t);

test("Ping publishes intermediate results before completion", async () => {
  const partial = { status: "in-progress", results: [{ result: { status: "finished", stats: { avg: 12 } } }] };
  const final = { status: "finished", results: partial.results };
  const responses = [{ id: "test-id" }, partial, final];
  const snapshots = [];
  const run = createRunner(async () => {
    if (responses.length === 1) assert.deepEqual(snapshots, [partial]);
    return responses.shift();
  }, (fn) => fn());
  assert.deepEqual(await run({ host: "1.1.1.1", nodes: ["n01"] }, new AbortController().signal, (data) => snapshots.push(data)), final);
  assert.deepEqual(snapshots, [partial, final]);
});

test("cancelled Ping does not publish stale results", async () => {
  const controller = new AbortController();
  let calls = 0;
  const run = createRunner(async () => {
    if (++calls === 1) return { id: "test-id" };
    controller.abort();
    return { status: "finished", results: [] };
  }, (fn) => fn());
  await assert.rejects(() => run({ host: "1.1.1.1", nodes: ["n01"] }, controller.signal, () => assert.fail("stale update")), { name: "AbortError" });
});


test("custom cities run in sequential batches and preserve earlier results", async () => {
  const requested = [];
  let id = 0;
  const run = createRunner(async (path, options) => {
    if (path === "/ping/start") { requested.push(JSON.parse(options.body).nodes); return { id: String(++id) }; }
    return { id: String(id), status: "finished", results: [{ probe: { city: String(id) }, result: { status: "finished" } }] };
  }, (fn) => fn());
  const updates = [];
  const result = await run({ host: "1.1.1.1", nodes: Array.from({ length: 51 }, (_, i) => `city${i}`) }, new AbortController().signal, (value) => updates.push(value));
  assert.deepEqual(requested.map((batch) => batch.length), [50, 1]);
  assert.equal(updates[0].status, "in-progress");
  assert.equal(result.results.length, 2);
});

test("completed identical measurements reuse quota regardless of node order", async () => {
  let starts = 0;
  const run = createRunner(async (path) => {
    if (path === "/ping/start") { starts++; return { id: "reuse" }; }
    return { id: "reuse", status: "finished", results: [] };
  }, (fn) => fn());
  const signal = new AbortController().signal;
  await run({ host: "example.com", nodes: ["a", "b"] }, signal);
  const cached = await run({ host: "example.com", nodes: ["b", "a"] }, signal);
  assert.equal(starts, 1);
  assert.equal(typeof cached.reusedAt, "number");
  await run({ host: "example.com", nodes: ["a"] }, signal);
  assert.equal(starts, 2);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => run({ host: "example.com", nodes: ["a"] }, controller.signal), { name: "AbortError" });
});
