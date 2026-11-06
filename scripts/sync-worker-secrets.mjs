import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { parseEnv } from "node:util";

const environment = process.argv[2];
const pages = process.argv.includes("--pages");
if (environment !== "production")
  throw new Error("Only production is supported");
const filename = `.secrets.${environment}.env`;
if (!existsSync(filename)) {
  console.log("No optional configuration; nothing to synchronize.");
  process.exit(0);
}
const ignored = spawnSync("git", ["check-ignore", "-q", filename]);
if (ignored.status !== 0) throw new Error("Secret file must be ignored by Git");
const values = parseEnv(readFileSync(filename, "utf8"));
const allowed = [
  "TURNSTILE_NONINTERACTIVE_SITE_KEY",
  "TURNSTILE_NONINTERACTIVE_SECRET",
  "TURNSTILE_NONINTERACTIVE_HOSTNAMES",
  "TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET",
  "TURNSTILE_HOSTNAMES",
  "TIANDITU_TOKEN",
];
// Keys for features that were removed; skipped instead of uploaded.
const retired = [
  "RECAPTCHA_SITE_KEY",
  "RECAPTCHA_SECRET",
  "RECAPTCHA_HOSTNAMES",
];
const skipped = Object.keys(values).filter((key) => retired.includes(key));
if (skipped.length)
  console.log(`Skipping retired keys (safe to delete): ${skipped.join(", ")}`);
if (
  Object.keys(values).some(
    (key) => !allowed.includes(key) && !retired.includes(key),
  )
)
  throw new Error("Secret file contains unsupported configuration keys");
const secrets = Object.fromEntries(
  Object.entries(values).filter(
    ([key, value]) => !retired.includes(key) && value.trim(),
  ),
);
if (!Object.keys(secrets).length) {
  console.log("No optional secrets configured; nothing to synchronize.");
  process.exit(0);
}
if (process.argv.includes("--check")) {
  console.log(
    `${environment}: ${Object.keys(secrets).length} secrets ready; values not displayed.`,
  );
} else {
  const result = spawnSync(
    "pnpm",
    pages
      ? ["exec", "wrangler", "pages", "secret", "bulk", "--cwd", "deploy/pages"]
      : ["exec", "wrangler", "secret", "bulk", "--env", ""],
    {
      input: JSON.stringify(secrets),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  if (result.status !== 0) {
    console.error(
      "Secret sync failed. Check Wrangler authentication and target environment. Command output withheld to protect secret values.",
    );
    process.exit(1);
  }
  console.log(`${environment}: secrets synchronized.`);
}
