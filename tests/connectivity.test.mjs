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

test("two consecutive failures stop the target without inventing remaining samples", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new TypeError("offline"); };
  try {
    const result = await testConnectivity("https://example.com");
    assert.equal(calls, 2);
    assert.deepEqual(result.samples, [-1, -1]);
    assert.equal(result.median, null);
  } finally { globalThis.fetch = original; }
});

test("a successful sample resets the failure streak on a flaky connection", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    if (++calls % 2) throw new TypeError("temporary failure");
    return new Response(null, { status: 204 });
  };
  try {
    const result = await testConnectivity("https://example.com");
    assert.equal(calls, 8);
    assert.equal(result.samples.length, 8);
    assert.ok(result.median >= 0);
  } finally { globalThis.fetch = original; }
});

test("single probes allow weak-network responses beyond one second and abort at three seconds", async () => {
  const original = globalThis.fetch;
  const { probe } = await import("../src/lib/network.ts");
  const keepAlive = setInterval(() => {}, 100);
  try {
    globalThis.fetch = (_, { signal }) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", abort);
        resolve(new Response(null, { status: 204 }));
      }, 1200);
      const abort = () => { clearTimeout(timer); reject(signal.reason); };
      signal.addEventListener("abort", abort, { once: true });
    });
    assert.ok(await probe("https://example.com") >= 1100);
    globalThis.fetch = (_, { signal }) => new Promise((_, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
    const start = performance.now();
    assert.equal(await probe("https://example.com"), -1);
    const elapsed = performance.now() - start;
    assert.ok(elapsed >= 2800 && elapsed < 4500, `elapsed ${elapsed}`);
  } finally {
    clearInterval(keepAlive);
    globalThis.fetch = original;
  }
});
