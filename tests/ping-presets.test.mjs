import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
const code = ts.transpileModule(readFileSync("src/views/ping/presets.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { selectPingPresets } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
const nodes = [
  { id: "CN:Shanghai", cc: "cn", continent: "AS", probes: 5 },
  { id: "CN:Beijing", cc: "cn", continent: "AS", probes: 4 },
  { id: "HK:Hong Kong", cc: "hk", continent: "AS", probes: 50 },
  { id: "US:Small", cc: "us", continent: "NA", probes: 100 },
  { id: "US:Cloud", cc: "us", continent: "NA", probes: 2, preferredAsn: 16509, preferredProbes: 2 },
];
test("preferred presets include two distinct mainland cities and prefer major networks", () => {
  const { presetNodes } = selectPingPresets(nodes, "world", false);
  assert.equal(presetNodes.filter((node) => node.cc === "cn").length, 2);
  assert.ok(presetNodes.some((node) => node.id === "US:Cloud"));
  assert.ok(!presetNodes.some((node) => node.id === "US:Small"));
  assert.equal(selectPingPresets(nodes, "NA", false).presetNodes.filter((node) => node.cc === "cn").length, 2);
});
test("missing mainland nodes are not replaced with Hong Kong or invented nodes", () => {
  assert.equal(selectPingPresets(nodes.filter((node) => node.cc !== "cn"), "world", false).chinaNodes.length, 0);
});
