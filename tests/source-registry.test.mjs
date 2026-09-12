import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  DIAGNOSTIC_PARSER_VERSION,
  DIAGNOSTIC_REGISTRY_VERSION,
  diagnosticQueryVersions,
  queryKeys,
} from "../src/lib/query-keys.ts";
import {
  buildSourceRegistry,
  SOURCE_PARSER_VERSION,
  SOURCE_REGISTRY_VERSION,
  sourceParserVersion,
  sourceRegistry,
  sourceRegistryVersion,
  sourceById,
} from "../src/views/home/source-registry.ts";

const rawSites = JSON.parse(readFileSync("src/views/home/sites.json", "utf8"));
const baseSource = {
  id: "legacy-test0000",
  name: "Example",
  type: "international",
  icon: "https://icons.duckduckgo.com/ip3/example.com.ico",
};

test("sources use explicit stable IDs and preserve source behavior", () => {
  assert.equal(sourceRegistry.length, 50);
  assert.equal(rawSites.length, sourceRegistry.length);
  assert.ok(rawSites.every((source) => typeof source.id === "string"));
  assert.equal(sourceRegistry[0].id, "legacy-703995bb");
  assert.equal(sourceRegistry[49].id, "legacy-0a63fc64");

  const ids = sourceRegistry.map((source) => source.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(sourceRegistry.every((source) => source.id.startsWith("legacy-")));
  assert.ok(
    sourceRegistry.every((source) => source.sourceUrl.startsWith("https://")),
  );
  assert.ok(
    sourceRegistry.every((source) => source.groups.includes(source.type)),
  );

  assert.ok(
    sourceRegistry.some(
      (source) =>
        source.method === "unsupported" && source.execution === "link-only",
    ),
  );
  assert.ok(
    sourceRegistry.some(
      (source) => source.method === "cftrace" && source.kind === "site-egress",
    ),
  );
  for (const source of sourceRegistry)
    assert.equal(sourceById(source.id), source);
});

test("diagnostic query keys carry the source registry and parser contract", () => {
  assert.match(SOURCE_REGISTRY_VERSION, /^[a-z0-9][a-z0-9.-]*$/);
  assert.match(SOURCE_PARSER_VERSION, /^[a-z0-9][a-z0-9.-]*$/);
  assert.equal(sourceRegistryVersion, SOURCE_REGISTRY_VERSION);
  assert.equal(sourceParserVersion, SOURCE_PARSER_VERSION);
  assert.deepEqual(diagnosticQueryVersions, {
    registry: SOURCE_REGISTRY_VERSION,
    parser: SOURCE_PARSER_VERSION,
  });
  assert.equal(DIAGNOSTIC_REGISTRY_VERSION, SOURCE_REGISTRY_VERSION);
  assert.equal(DIAGNOSTIC_PARSER_VERSION, SOURCE_PARSER_VERSION);
  assert.deepEqual(queryKeys.home.split("source-a", 2), [
    "split",
    SOURCE_REGISTRY_VERSION,
    SOURCE_PARSER_VERSION,
    "source-a",
    2,
  ]);
});

test("registry builder validates method shape and consistency", () => {
  assert.deepEqual(
    buildSourceRegistry([
      { ...baseSource, method: "ip-json", url: "https://example.com/ip" },
    ]).map((source) => ({
      id: source.id,
      method: source.method,
      execution: source.execution,
      kind: source.kind,
      sourceUrl: source.sourceUrl,
    })),
    [
      {
        id: "legacy-test0000",
        method: "ip-json",
        execution: "client-request",
        kind: "ip-api",
        sourceUrl: "https://example.com/ip",
      },
    ],
  );

  assert.throws(
    () =>
      buildSourceRegistry([
        { ...baseSource, method: "ip-json", url: "http://example.com/ip" },
      ]),
    /url 必须使用 HTTPS/,
  );
  assert.throws(
    () =>
      buildSourceRegistry([
        {
          ...baseSource,
          method: "cftrace",
          domain: "example.com",
          url: "https://example.com",
        },
      ]),
    /cftrace 不应配置 url/,
  );
  assert.throws(
    () =>
      buildSourceRegistry([
        {
          ...baseSource,
          method: "cftrace",
          domain: "http://example.com",
        },
      ]),
    /domain 必须是主机名/,
  );
  assert.throws(
    () =>
      buildSourceRegistry([
        {
          ...baseSource,
          method: "cftrace",
          domain: "example.com",
          kind: "ip-api",
        },
      ]),
    /kind 必须是 site-egress/,
  );
  assert.throws(
    () =>
      buildSourceRegistry([
        {
          ...baseSource,
          method: "unsupported",
          domain: "example.com",
          execution: "client-request",
        },
      ]),
    /execution 必须是 link-only/,
  );
  assert.throws(
    () =>
      buildSourceRegistry([
        { ...baseSource, method: "missing", url: "https://example.com" },
      ]),
    /未知 method/,
  );
  assert.throws(
    () =>
      buildSourceRegistry([
        {
          ...baseSource,
          method: "ip-json",
          url: "https://example.com/ip",
          enabledByDefualt: false,
        },
      ]),
    /未知字段：enabledByDefualt/,
  );
  assert.throws(
    () =>
      buildSourceRegistry([
        { ...baseSource, method: "ip-json", url: "https://example.com/a" },
        { ...baseSource, method: "ip-text", url: "https://example.com/b" },
      ]),
    /id 重复/,
  );
});
