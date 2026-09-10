import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { parseEnv } from "node:util";

const environment = process.argv[2];
if (environment !== "production")
  throw new Error("Only production is supported");
const filename = `.secrets.${environment}.env`;
if (!existsSync(filename))
  throw new Error(
    `Missing ${filename}; copy .secrets.example and fill in the required secrets.`,
  );
const ignored = spawnSync("git", ["check-ignore", "-q", filename]);
if (ignored.status !== 0) throw new Error("Secret file must be ignored by Git");
const values = parseEnv(readFileSync(filename, "utf8"));
const allowed = [
  "TURNSTILE_SECRET",
  "RECAPTCHA_SECRET",
  "GLOBALPING_TOKEN",
  "IPQS_KEY",
];
if (Object.keys(values).some((key) => !allowed.includes(key)))
  throw new Error("Secret file contains unsupported configuration keys");
const secrets = Object.fromEntries(
  Object.entries(values).filter(([, value]) => value.trim()),
);
if (!Object.keys(secrets).length)
  throw new Error(
    "No secrets configured; refusing to deploy an empty configuration",
  );
const config = readFileSync("wrangler.toml", "utf8");
const marker = "[vars]";
const section = config.split(marker)[1]?.split(/\n\s*\[/)[0] ?? "";
for (const prefix of ["TURNSTILE", "RECAPTCHA"]) {
  const getValue = (key) =>
    section.match(new RegExp(`^${key}\\s*=\\s*"([^"\\n]*)"`, "m"))?.[1] ?? "";
  if (!getValue(`${prefix}_SITE_KEY`)) continue;
  if (!secrets[`${prefix}_SECRET`])
    throw new Error(`${prefix}: missing matching secret in ${filename}`);
  const hosts = getValue(`${prefix}_HOSTNAMES`)
    .split(",")
    .map((value) => value.trim());
  if (
    !hosts.length ||
    hosts.some(
      (host) =>
        !host ||
        /[:/\\s]/.test(host) ||
        ["localhost", "127.0.0.1"].includes(host),
    )
  )
    throw new Error(
      `${prefix}: configure non-local hostnames without protocol or port`,
    );
}
if (process.argv.includes("--check")) {
  console.log(
    `${environment}: ${Object.keys(secrets).length} secrets ready; values not displayed.`,
  );
} else {
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "wrangler",
      "secret",
      "bulk",
      "--env",
      "",
    ],
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
