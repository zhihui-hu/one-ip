import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { t } from "../src/i18n/index.ts";

test("home platform summary initializes its featured services when imported", () => {
  const source = readFileSync("src/views/home/platform-summary.tsx", "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const exports = {};
  const services = JSON.parse(
    readFileSync("src/views/status/services.json", "utf8"),
  );
  const require = (name) => {
    if (name === "@/views/status/services.json") return services;
    if (name === "@/i18n") return { t };
    return {};
  };
  new Function("require", "exports", outputText)(require, exports);
  assert.equal(typeof exports.PlatformSummary, "function");
});
