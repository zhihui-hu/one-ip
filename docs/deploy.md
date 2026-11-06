# 部署与配置

[返回 README](../README.md) · [English](deploy.en.md)

## Cloudflare 部署教程

1. [Fork 本项目](https://github.com/zhihui-hu/one-ip/fork)到你的 GitHub 账号。
2. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)，进入 **Workers & Pages**，创建 Worker，选择导入 Git 仓库。
3. 连接 GitHub，选择你的 `one-ip` Fork，生产分支填 `main`。
4. 构建命令填 `pnpm build`，部署命令填 `pnpm deploy`。使用 Node.js 24 和 pnpm 10.32.1，根目录保持默认。
5. 点击部署，完成后打开 `workers.dev` 地址。自定义域名在 Worker 设置中绑定。

项目使用 **Cloudflare Workers + Static Assets**，`/api/*` 接口需要 Worker。基础功能无需应用环境变量或 API Key。Turnstile 的配置见“验证体验”。

国内网络访问地图时，建议在 Worker → Settings → Variables and Secrets 配置 `TIANDITU_TOKEN`（也可以用 `pnpm exec wrangler secret put TIANDITU_TOKEN`）。配置后地图优先使用天地图，失败时回退到 OpenStreetMap；未配置时保持 OpenStreetMap。

默认地图无需注册或 API Key。OpenStreetMap 公共瓦片须遵守[使用政策](https://operations.osmfoundation.org/policies/tiles/)，保留地图署名、按需加载并使用浏览器缓存，不提供离线下载或批量预取；公共服务不保证可用性。瓦片请求仅发送本站 origin 作为 Referer，不包含查询 IP 的页面路径。地图加载失败时可单独重试，位置文字和坐标仍可查看。

Workers Builds 会在 `main` 收到提交时构建和部署。上方按钮使用原项目地址；需要保留 Fork 关系和更新工作流时，请按教程导入你的 Fork。

## Cloudflare Pages 部署

Pages 使用同一套 API，通过 [Advanced mode](https://developers.cloudflare.com/pages/functions/advanced-mode/) 打包为 `dist-pages/_worker.js`。`_routes.json` 只让 API 和后端保护路径进入函数，页面和静态资源直接由 Pages 提供。不要把普通 `dist` 当作完整的 Pages 部署产物。

**控制台连接 Git 仓库：** 创建 Pages 项目，框架预设选择 None，根目录保持仓库根目录；构建命令填写 `pnpm build:pages`，输出目录填写 `dist-pages`。构建环境使用 `NODE_VERSION=24`、`PNPM_VERSION=10.32.1`。在生产和预览环境的 Functions 设置中填写兼容日期 `2026-09-09`，添加 `nodejs_compat`。根目录的 `wrangler.toml` 服务于 Workers；Pages 的 CLI 配置单独位于 `deploy/pages/wrangler.toml`。

**CLI 直接部署：**

```bash
pnpm install --frozen-lockfile
pnpm build:pages
pnpm exec wrangler login
# 首次部署时创建项目；已有项目跳过此行
pnpm exec wrangler pages project create one-ip --production-branch main
pnpm deploy:pages --branch main
```

项目名称在 `deploy/pages/wrangler.toml` 中修改。可选密钥在 Pages 项目的生产/预览环境中分别配置，或使用 `pnpm exec wrangler pages secret put 名称 --cwd deploy/pages`。已有 `.secrets.production.env` 时，可执行 `node scripts/sync-worker-secrets.mjs production --pages`。本地预览使用 `pnpm pages:dev`，需要先执行 `pnpm build:pages`；预览用的密钥放在 `deploy/pages/.dev.vars`。

## Docker 部署

Docker 镜像包含前端和 Node.js API 服务，可独立运行，不需要另设 Worker。Compose 配置需要 Docker Compose 2.24 或更新版本。多阶段构建只将静态资源、API 服务和许可证放入运行镜像，默认使用非 root 用户。

```bash
# 可选：填写地图和验证服务配置，已有文件请直接编辑
cp .env.docker.example .env.docker
docker compose up -d --build
```

打开 `http://服务器地址:8080`。宿主机端口可通过 `PORT=8088 docker compose up -d --build` 修改。也可以手动构建和运行：

```bash
docker build -t one-ip:local .
docker run -d --name one-ip --restart unless-stopped -p 8080:8080 --env-file .env.docker one-ip:local
```

环境变量在容器启动时读取，修改后执行 `docker compose up -d --force-recreate`；密钥不会编译进前端。`/healthz` 是容器健康检查入口，不依赖外部数据源。本机直接运行同一服务可用 `pnpm build:docker` 后执行 `pnpm start`。

生产环境建议在前方配置 HTTPS 反向代理，浏览器部分检测需要安全上下文。默认使用 TCP 连接地址，不信任请求中自带的 `CF-Connecting-IP` 或转发头。使用代理时，在 `.env.docker` 的 `TRUSTED_PROXIES` 中填写紧邻容器的代理 IP 或专用 CIDR，多个值用逗号分隔。以下 Nginx 示例用于同机代理；同时用 `BIND_ADDRESS=127.0.0.1 docker compose up -d --build` 限制端口仅在本机监听，并按容器实际看到的代理地址配置白名单：

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $http_host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

代理须覆盖转发头。服务仅信任白名单代理提供的最后一跳访客地址；多层代理需在入口完成真实 IP 解析。白名单代理没有传 `X-Forwarded-For` 时，日志会输出一次 `proxy_missing_client_ip`。

`PUBLIC_ORIGIN` 填写访客实际使用的地址（如 `https://ip.example.com`）。设置后，同源校验和人机验证域名都以它为准，不再依赖代理传 `X-Forwarded-Proto`。HTTPS 代理不在白名单中时，必须设置此项，否则 Ping 和人机验证的 POST 请求会被同源校验拒绝。

Docker 前面套 Cloudflare 代理时，可设置 `TRUST_CF_CONNECTING_IP=true`，从白名单代理转发的 `CF-Connecting-IP` 读取访客地址。白名单须为 [Cloudflare IP 段](https://www.cloudflare.com/ips/)，或只接受 Cloudflare 回源流量的代理；其他来源带的此请求头会被丢弃。

Docker 访客归属地使用公开数据源；私网连接地址不会当作公网出口。Docker 缺少 Cloudflare 的 JA3/JA4/TLS 元数据时返回空值。Docker 用进程内缓存替代 Cloudflare 边缘缓存，最多 1000 条、32 MB，按接口原有的 TTL 过期，重启后清空。

Workers 使用原生限流。Pages 和 Docker 使用每个实例内的内存限流（普通查询/图标各 180 次/分钟，POST 5 次/分钟），IPv6 按 /64 计数，重启会重置，多个实例不共享计数。Pages 的计数分散在多个边缘实例中，基本不起作用；需要严格限流时，在 Cloudflare 控制台为 `/api/*` 配置 WAF 限流规则。

## 验证体验（可选）

为 Turnstile 填写 Site Key、Secret 和允许访问的域名。发起新的 Ping 测量必须配置 Turnstile（普通或 Non-interactive），保留每分钟 5 次限流；每个批次使用独立 token，服务端校验 `ping_start` action、hostname 和凭证有效性，未配置时拒绝发起测量。WebMCP 调用同样需要完成弹出的人机校验。

| 提供商    | 配置项                                                          |
| --------- | --------------------------------------------------------------- |
| Turnstile | `TURNSTILE_SITE_KEY`、`TURNSTILE_SECRET`、`TURNSTILE_HOSTNAMES` |

本地开发：把[配置示例](config/challenges.env.example)复制到根目录 `.dev.vars`，填写密钥并重启。文件存在时编辑原文件。域名用逗号分隔，填写格式为 `example.com`，提供商控制台需要允许对应域名。

线上部署：在 Worker → Settings → Variables and Secrets 填写配置，或执行 `pnpm exec wrangler secret put 名称`。使用配置文件时，把 `.secrets.example` 复制为 `.secrets.production.env`，填写后运行：

```bash
node scripts/sync-worker-secrets.mjs production --check
node scripts/sync-worker-secrets.mjs production
```

脚本上传非空项，保留已有 Secret，跳过缺失的可选文件。Pages 加 `--pages`；Docker 使用 `.env.docker`。敏感文件在 Git 忽略列表中。Secret 应放在服务端配置中，不能放进 `VITE_*`。`/api/browser/challenges` 的 `configured` 字段用于检查配置结果。

## GitHub Actions 部署（可选）

Workers Builds 和 GitHub Actions 选择一种部署方式，避免重复发布。Actions 默认执行构建和测试；开启部署需要在仓库的 Actions 设置中添加：

| 类型     | 名称                    | 用途                              |
| -------- | ----------------------- | --------------------------------- |
| Variable | `ENABLE_CF_DEPLOY=true` | 开启部署                          |
| Variable | `CF_DEPLOY_TARGET`      | `workers`（默认）或 `pages`       |
| Variable | `CF_DEPLOY_BRANCH`      | 部署分支，默认是仓库默认分支      |
| Secret   | `CLOUDFLARE_API_TOKEN`  | 对应目标的 Workers/Pages 部署凭证 |
| Secret   | `CLOUDFLARE_ACCOUNT_ID` | 目标 Cloudflare 账户 ID           |

推送到部署分支（默认 `main`），或在该分支上运行 `Build and deploy one-ip`。构建、测试和 Docker 冒烟测试通过后进入部署；其他分支只做构建和测试。只改文档不会触发。部署使用 `production` 环境，Secret 可以放在仓库或该环境中。外部 PR 执行测试，不获得部署凭证。这些凭证用于 CI。

选择 `pages` 时先创建与 `deploy/pages/wrangler.toml` 同名的 Pages 项目。使用 Pages Git 集成时，无需开启 Actions 部署。

## Fork 更新

在 GitHub 仓库页面点击 **Sync fork → Update branch**。有代码改动时检查差异，通过合并处理冲突。

定时同步使用 `Sync upstream` 工作流：

1. 在 Fork 的 Actions 页面启用工作流。
2. 在 Settings → Secrets and variables → Actions → **Variables** 添加 `AUTO_SYNC_UPSTREAM=true`。
3. 工作流在每天 UTC 04:23 检查更新。Actions 页面提供运行入口。

支持范围是从 `zhihui-hu/one-ip` 创建的 Fork，无需个人访问令牌（PAT）。工作流通过 GitHub 的 `merge-upstream` 接口合并更新，遇到冲突时停止，保留你的提交。需要审核更新时，使用 GitHub 的 Sync fork。

- **Workers Builds**：连接 Fork 的生产分支，在 Cloudflare 构建历史中检查同步提交的部署记录。
- **GitHub Actions 部署**：同步产生更新时，工作流触发部署任务。`GITHUB_TOKEN` 产生的推送不会触发普通 `push` 工作流。
- 分支保护阻止合并时，通过 PR 处理。
- Fork 的定时工作流需要启用。公开仓库 60 天无活动可能导致 GitHub 停用定时任务，恢复入口在 Actions 页面。

参考：[同步 Fork](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/syncing-a-fork)、[GITHUB_TOKEN 触发规则](https://docs.github.com/en/actions/concepts/security/github_token)、[定时工作流停用规则](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows)。

## WebMCP

支持浏览器原生 WebMCP：在提供 `document.modelContext` 的浏览器中，页面会注册结构化工具，覆盖 IP / WHOIS 查询、网络与 AI 检测、服务状态及浏览器诊断。`one_ip_catalog` 可列出支持的站点、平台和页面；`one_ip_open_page` 可导航到需要用户操作的权限页面。工具使用现有数据源和请求限制，支持取消；不支持 WebMCP 的浏览器仍可正常使用网页。

WebMCP 仍处于实验阶段。本地可在 Chrome 开启 `chrome://flags/#enable-webmcp-testing` 后检查 `await document.modelContext.getTools()`；线上 Chrome 访问需要参与 [WebMCP Origin Trial](https://developer.chrome.com/docs/ai/webmcp/) 或等待浏览器正式支持。本站没有内置试验令牌。工具只在当前页面同源暴露，不向跨源 iframe 授权。查询结果可能包含第三方数据；浏览器指纹、出口 IP 和 WebRTC 结果可能涉及隐私，调用前应由用户决定是否交给代理处理。

## 人机校验与 Claude 环境对照

可选的第二个 Turnstile 组件使用 `TURNSTILE_NONINTERACTIVE_SITE_KEY`、`TURNSTILE_NONINTERACTIVE_SECRET` 和 `TURNSTILE_NONINTERACTIVE_HOSTNAMES`，并须在 Cloudflare 中选择 **Non-interactive** 模式；未配置时不显示。

Claude 页面比较 `claude.ai` 与 `claude.com` 出口，并检查 DNS、WebRTC、语言、时区及浏览器特征。检测字典参考 [FuckClaude](https://github.com/LinXiaoTao/FuckClaude)，许可证和来源说明见 `vendor/claude-environment/`。

以上结果仅用于环境排查，不代表 Claude 官方判定、账号风险或封禁概率；页面不读取本机 Claude Code 配置，也不展示 Cloudflare 企业版 Bot Management 分数。

社区友链：[LINUX DO](https://linux.do/) · 真诚、友善、团结、专业。
