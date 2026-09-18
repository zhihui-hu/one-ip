# Cloudflare Pages 部署（与 Worker 隔离）

本项目支持两种部署，配置文件完全隔离，互不干扰。

| 方式   | 配置文件              | 后端位置                                                     | 构建/部署命令                                                                      | SPA fallback                                                                                     |
| ------ | --------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Worker | `wrangler.toml`       | `public/worker/*.js`                                         | `pnpm build` + `pnpm deploy` / `make deploy`                                       | `not_found_handling = single-page-application`                                                   |
| Pages  | `wrangler.pages.toml` | `functions/api/[[path]].js`（复用 `public/worker/index.js`） | `pnpm build:pages` + `pnpm deploy:pages` / `make pages-build`、`make pages-deploy` | `dist/_redirects`（`/* /index.html 200`，由 `scripts/build-pages.mjs` 生成，不提交到 `public/`） |

隔离原则：

- `wrangler.toml` 不加 `pages_build_output_dir`，只用于 Worker。
- `wrangler.pages.toml` 不写 `main`，只用于 Pages（`pages_build_output_dir = "./dist"`）。
- `public/_redirects` 不提交，避免影响 Worker；Pages 的 `_redirects` 仅在构建时写入 `dist/`。
- `functions/worker/[[path]].js` 对 `/worker/*` 直接 404，与 Worker 行为对齐，避免 SPA fallback 暴露后端路径。

## 首次部署到 Pages

1. 在 Cloudflare 控制台 **Workers & Pages** 创建 Pages 项目，名称建议 `one-ip-pages`（与 `wrangler.pages.toml` 的 `name` 一致）。
2. 本地构建预览：
   ```bash
   pnpm build:pages
   pnpm pages:dev
   ```
   打开 `http://127.0.0.1:8788`（`preview:pages` 固定 8788，避免占用 Worker 的 8787）。
3. 发布：
   ```bash
   pnpm deploy:pages
   ```

## CI 自动部署

`.github/workflows/pages.yml` 包含 `deploy-worker` 与 `deploy-pages` 两个任务，`Sync upstream` 同步产生更新时会触发同一流程。缺省部署 Worker；仓库 Variables 设置 `DEPLOY_PAGE=true` 则改发 Pages（二选一，不会同时发两边）。

`ENABLE_CF_DEPLOY=true` 仍是总开关。`CLOUDFLARE_API_TOKEN` 部署 Pages 时需包含 Pages 写权限。

## 说明

- `functions/api/[[path]].js` 只是薄适配层，所有 `/api/*` 逻辑仍在 `public/worker/`，改接口只改一处。
- Pages 暂不下发 `[[ratelimits]]`（Pages Functions schema 未明确支持），后端已兼容缺失限流器：无绑定时跳过限流，接口仍可用。如需限流，请在 Pages 控制台或后续配置补齐。
- Worker 部署链路（`wrangler.toml`、`pnpm deploy`、`make deploy`）保持原样。
