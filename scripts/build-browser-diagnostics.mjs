import { adaptNavigator } from "./browser-diagnostics-adapter.mjs";
import { createHash } from "node:crypto";
import { readFile, writeFile, copyFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { rollup } from "rollup";
import ts from "typescript";

const bundle = await rollup({
  input: "vendor/browser-diagnostics/entry.ts",
  plugins: [
    {
      name: "local-typescript",
      async resolveId(source, importer) {
        if (!importer || !source.startsWith(".")) return null;
        const base = resolve(dirname(importer), source);
        for (const candidate of [`${base}.ts`, `${base}/index.ts`]) {
          if (
            await stat(candidate).then(
              () => true,
              () => false,
            )
          )
            return candidate;
        }
        return null;
      },
      transform(code, id) {
        if (!id.endsWith(".ts")) return null;
        if (id === resolve("vendor/browser-diagnostics/upstream/navigator/index.ts")) code = adaptNavigator(code);
        return {
          code: ts.transpileModule(code, {
            compilerOptions: {
              target: ts.ScriptTarget.ES2020,
              module: ts.ModuleKind.ESNext,
            },
          }).outputText,
          map: null,
        };
      },
    },
  ],
});
const { output } = await bundle.generate({
  format: "iife",
  banner:
    "/*! Based on CreepJS (MIT), Copyright (c) 2021 abrahamjuliot. License: /browser-diagnostics.LICENSE.txt */",
});
await bundle.close();
const code = output[0].code;
await writeFile("public/browser-diagnostics.js", code);
await copyFile(
  "vendor/browser-diagnostics/LICENSE",
  "public/browser-diagnostics.LICENSE.txt",
);
const upstream = JSON.parse(
  await readFile("vendor/browser-diagnostics/upstream.json", "utf8"),
);
await writeFile(
  "src/views/browser/diagnostics-version.json",
  JSON.stringify(
    {
      commit: upstream.commit,
      bundleHash: createHash("sha256").update(code).digest("hex"),
    },
    null,
    2,
  ) + "\n",
);
