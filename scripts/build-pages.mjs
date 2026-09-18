import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// 复用现有 SPA 构建（tsc -b && vite build），产物仍为 ./dist。
// 不改动 public/，避免影响 Worker 部署。
run("pnpm", ["build"]);

// Pages SPA fallback：Worker 靠 wrangler.toml 的 not_found_handling，
// Pages 靠 dist/_redirects。构建脚本生成，不提交到 public/，两者隔离。
writeFileSync("./dist/_redirects", "/* /index.html 200\n");
console.log("pages build ready: dist + dist/_redirects");
