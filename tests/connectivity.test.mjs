import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const moduleUrl = (source) =>
  `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText).toString("base64")}`;
const network = moduleUrl(readFileSync("src/lib/network.ts", "utf8"));
const { testConnectivity } = await import(
  moduleUrl(
    readFileSync("src/views/link/api.ts", "utf8").replace(
      '"@/lib/network"',
      JSON.stringify(network),
    ),
  )
);

test("each probe publishes an immutable snapshot before the batch finishes", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 204 });
  try {
    const snapshots = [];
    const result = await testConnectivity(
      "https://example.com",
      undefined,
      (value) => snapshots.push(value),
    );
    assert.deepEqual(
      snapshots.map((value) => value.samples.length),
      [0, 1, 2, 3, 4, 5, 6, 7, 8],
    );
    assert.equal(result.samples.length, 8);
    assert.ok(result.median >= 0);
    assert.deepEqual(snapshots[0].samples, []);
  } finally {
    globalThis.fetch = original;
  }
});

test("cancelled runs stop publishing progress and scheduling probes", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response(null, { status: 204 });
  };
  try {
    const controller = new AbortController();
    const snapshots = [];
    await assert.rejects(
      testConnectivity("https://example.com", controller.signal, (value) => {
        snapshots.push(value.samples.length);
        if (value.samples.length === 3) controller.abort();
      }),
      { name: "AbortError" },
    );
    assert.deepEqual(snapshots, [0, 1, 2, 3]);
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = original;
  }
});
