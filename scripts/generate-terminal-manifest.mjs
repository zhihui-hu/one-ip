import { readFile, writeFile } from "node:fs/promises";
import { buildSourceRegistry } from "../src/lib/diagnostic-source.ts";

const rawSites = JSON.parse(
  await readFile(
    new URL("../src/views/home/sites.json", import.meta.url),
    "utf8",
  ),
);
const sources = buildSourceRegistry(rawSites).flatMap((source) => {
  if (source.execution === "link-only") return [];
  switch (source.method) {
    case "ip-text":
    case "ip-json":
      return [{ id: source.id, method: source.method, url: source.url }];
    case "cftrace":
    case "headers":
      return [];
    default: {
      const unsupported = source;
      throw new Error(`终端来源不支持：${unsupported.method}`);
    }
  }
});
const manifest = {
  schemaVersion: 1,
  registryVersion: "terminal-v1",
  sources,
};

await writeFile(
  new URL("./terminal-sources.json", import.meta.url),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
