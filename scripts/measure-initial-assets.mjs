import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const htmlPath = process.argv[2] ?? "dist/index.html";
const html = readFileSync(htmlPath, "utf8");
const distRoot = htmlPath.endsWith("/index.html")
  ? htmlPath.slice(0, -"index.html".length)
  : "dist/";
const assets = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+)"/g)].map(
  (match) => match[1],
);

let total = 0;
for (const asset of assets) {
  const gzipBytes = gzipSync(readFileSync(join(distRoot, asset))).length;
  total += gzipBytes;
  console.log(`${gzipBytes}\t${asset}`);
}
console.log(`TOTAL\t${total}`);
