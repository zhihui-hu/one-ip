import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";

// Worker bundle tests need Wrangler's generated .worker-test/index.js.
// Keep them in test:worker; commercial tests run against the Rust API contract.
const files = readdirSync("tests")
  .filter((file) => file.endsWith(".test.mjs"))
  .filter(
    (file) =>
      !readFileSync(`tests/${file}`, "utf8").includes(".worker-test/index.js"),
  )
  .map((file) => `tests/${file}`);

const result = spawnSync(
  process.execPath,
  ["--import", "./tests/register-paths.mjs", "--test", ...files],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
