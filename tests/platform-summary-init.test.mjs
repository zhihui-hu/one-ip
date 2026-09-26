import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { compile } from "./compile.mjs";
import { t } from "../src/i18n/index.ts";

test("home platform summary initializes its featured services when imported", () => {
  const source = readFileSync("src/views/home/platform-summary.tsx", "utf8");
  const outputText = compile(source, { format: "cjs", loader: "tsx" });
  const module = { exports: {} };
  const services = JSON.parse(
    readFileSync("src/views/status/services.json", "utf8"),
  );
  const require = (name) => {
    if (name === "@/views/status/services.json") return services;
    if (name === "@/i18n") return { t };
    return {};
  };
  new Function("require", "module", outputText)(require, module);
  assert.equal(typeof module.exports.PlatformSummary, "function");
});
