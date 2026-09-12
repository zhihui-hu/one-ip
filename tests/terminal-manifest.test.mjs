import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildSourceRegistry } from "../src/lib/diagnostic-source.ts";

const rawSites = JSON.parse(readFileSync("src/views/home/sites.json", "utf8"));
const manifest = JSON.parse(
  readFileSync("scripts/terminal-sources.json", "utf8"),
);

test("terminal manifest is generated from the shared registry", () => {
  const registry = buildSourceRegistry(rawSites);
  const expected = registry.flatMap((source) => {
    if (source.execution === "link-only") return [];
    if (source.method === "ip-text" || source.method === "ip-json")
      return [{ id: source.id, method: source.method, url: source.url }];
    return [];
  });

  assert.deepEqual(manifest.sources, expected);
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.registryVersion, "terminal-v1");
  assert.ok(manifest.sources.length > 0);
  assert.equal(
    new Set(manifest.sources.map((source) => source.id)).size,
    manifest.sources.length,
  );

  const registryById = new Map(registry.map((source) => [source.id, source]));
  for (const source of manifest.sources) {
    const registered = registryById.get(source.id);
    assert.ok(registered, source.id);
    assert.equal(registered.execution, "client-request");
    assert.equal(registered.method, source.method);
    assert.equal(registered.url, source.url);
  }
});

test("terminal manifest excludes link-only and header adapters", () => {
  const registry = buildSourceRegistry(rawSites);
  const ids = new Set(manifest.sources.map((source) => source.id));
  for (const source of registry) {
    if (
      source.execution === "link-only" ||
      source.method === "headers" ||
      source.method === "cftrace"
    )
      assert.equal(ids.has(source.id), false, source.id);
  }
});
