import { adaptNavigator } from "../scripts/browser-diagnostics-adapter.mjs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const sha = (content) => createHash("sha256").update(content).digest("hex");
test("vendored detection modules match the pinned upstream revision", () => {
  const manifest = JSON.parse(
    readFileSync("vendor/browser-diagnostics/upstream.json", "utf8"),
  );
  assert.match(manifest.commit, /^[a-f0-9]{40}$/);
  for (const [file, hash] of Object.entries(manifest.files))
    assert.equal(
      sha(readFileSync(`vendor/browser-diagnostics/upstream/${file}`)),
      hash,
      file,
    );
  assert.equal(
    readFileSync("vendor/browser-diagnostics/LICENSE", "utf8"),
    readFileSync("public/browser-diagnostics.LICENSE.txt", "utf8"),
  );
});
test("runtime cache version matches the shipped local bundle and excludes remote app calls", () => {
  const version = JSON.parse(
    readFileSync("src/views/browser/diagnostics-version.json", "utf8"),
  );
  const bundle = readFileSync("public/browser-diagnostics.js", "utf8");
  assert.equal(sha(bundle), version.bundleHash);
  assert.doesNotMatch(
    bundle,
    /\bfetch\s*\(|new XMLHttpRequest|\.sendBeacon\s*\(/,
  );
  assert.match(bundle, /local-browser-diagnostics/);
});

test("navigator adapter skips absent Worker comparisons but preserves mismatch detection", () => {
  const source = adaptNavigator(readFileSync("vendor/browser-diagnostics/upstream/navigator/index.ts", "utf8"));
  for (const field of ["platform", "userAgent", "deviceMemory", "hardwareConcurrency", "language", "languages"]) {
    const expression = source.match(new RegExp(`if \\((workerScope && ${field} !==? workerScope\\.${field})\\)`))?.[1];
    assert.ok(expression, field);
    const compare = new Function("workerScope", field, `return Boolean(${expression})`);
    assert.equal(compare(undefined, "local"), false);
    assert.equal(compare({ [field]: "local" }, "local"), false);
    assert.equal(compare({ [field]: "other" }, "local"), true);
  }
});
