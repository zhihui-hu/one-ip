<img src="public/icon.svg" alt="One IP Logo" width="96" height="96" />

# One IP

IP 查询、网络诊断、浏览器检测与 AI 服务状态工具箱。

**中文** · [English](README.en.md)

[在线体验](https://ip.huzhihui.com/) · [GitHub](https://github.com/zhihui-hu/one-ip)

点击下方按钮，一键部署到 Cloudflare。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fzhihui-hu%2Fone-ip)

## Cloudflare 部署教程

1. [Fork 本项目](https://github.com/zhihui-hu/one-ip/fork)到你的 GitHub 账号。
2. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)，进入 **Workers & Pages**，创建 Worker，选择导入 Git 仓库。
3. 连接 GitHub，选择你的 `one-ip` Fork，生产分支填 `main`。
4. 构建命令填 `pnpm build`，部署命令填 `pnpm deploy`。使用 Node.js 24 和 pnpm 10.32.1，根目录保持默认。
5. 点击部署，完成后打开 `workers.dev` 地址。自定义域名在 Worker 设置中绑定。

项目使用 **Cloudflare Workers + Static Assets**，`/api/*` 接口需要 Worker。基础功能无需应用环境变量或 API Key。Turnstile 和 reCAPTCHA 的配置见“验证体验”。

Workers Builds 会在 `main` 收到提交时构建和部署。上方按钮使用原项目地址；需要保留 Fork 关系和更新工作流时，请按教程导入你的 Fork。

## 功能

| 模块             | 支持的功能                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| 首页概览         | 国内与外部 IPv4 探测、归属地、运营商、信誉分与类型标签                                                    |
| IP 详情          | IPv4 / IPv6 查询、ASN、CIDR、注册信息、网络属性、风险标记、地图、多源位置对比与关联地址；字段取决于数据源 |
| 网站分流与连通性 | 检查不同网站的出口 IP，按地址汇总；多轮 HTTP 采样、中位耗时与排序                                         |
| 全球 Ping        | Globalping 全球探针、地区与城市选择、延迟与丢包、分批返回结果                                             |
| DNS / CDN        | DNS 解析出口、CDN 命中节点及可读取的缓存信息                                                              |
| WHOIS            | 域名、IP、ASN 的 RDAP 注册资料与原始响应                                                                  |
| 浏览器检测       | 环境信息、FingerprintJS 指纹、环境一致性、CreepJS 深度检测、自动化特征、权限与 WebRTC                     |
| AI 访问          | ChatGPT、Claude、Grok、Perplexity、Gemini、DeepSeek、通义千问、Kimi 的资源连通性与部分平台出口对照        |
| 服务状态         | 聚合官方运行状态、故障、维护、组件与事件详情                                                              |
| 使用体验         | 中英文、深浅主题、移动端布局与底部抽屉、查询历史、二维码分享与复制链接                                    |
| 可选验证体验     | Cloudflare Turnstile、Google reCAPTCHA v3；入口需要配置和域名匹配                                         |

第三方服务的限流和跨域限制会影响查询结果。HTTP 耗时与 ICMP Ping 的测量方式不同。IP 类型和信誉分供参考，不代表 AI 平台的官方判断。

## 界面预览

截图遮盖了 IP、具体位置及运营商 / ASN，数值不是实时结果。

![桌面首页（已打码）](docs/screenshots/desktop-home-redacted.png)

<table>
  <tr><th>手机 · 浅色</th><th>手机 · 深色</th></tr>
  <tr>
    <td><img src="docs/screenshots/mobile-home-light-redacted.png" alt="手机浅色首页（已打码）" width="360" /></td>
    <td><img src="docs/screenshots/mobile-home-dark-redacted.png" alt="手机深色首页（已打码）" width="360" /></td>
  </tr>
</table>

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

## GitHub Actions 部署（可选）

Workers Builds 和 GitHub Actions 选择一种部署方式，避免重复发布。Actions 默认执行构建和测试；开启部署需要在仓库的 Actions 设置中添加：

| 类型     | 名称                    | 用途                       |
| -------- | ----------------------- | -------------------------- |
| Variable | `ENABLE_CF_DEPLOY=true` | 开启部署                   |
| Secret   | `CLOUDFLARE_API_TOKEN`  | 目标账户的 Worker 部署凭证 |
| Secret   | `CLOUDFLARE_ACCOUNT_ID` | 目标 Cloudflare 账户 ID    |

推送到 `main`，或运行 `Build and deploy one-ip`。构建和测试通过后进入部署。外部 PR 执行测试，不获得部署凭证。这些凭证用于 CI。

## 本地开发与部署

```bash
pnpm install --frozen-lockfile
pnpm worker:dev
```

打开 `http://127.0.0.1:8787`。命令启动 Vite 和本地 Worker，支持热更新。启动脚本为本地进程设置 `LOCAL_DEV=true`，无需修改 Wrangler 配置。

```bash
pnpm build
pnpm test
pnpm lint

# 登录 Cloudflare 并部署
pnpm exec wrangler login
pnpm deploy
```

`pnpm deploy` 使用 `dist` 中的构建产物，运行前需要执行 `pnpm build`。`make deploy` 包含版本更新、构建和部署，无需密钥文件。

## 验证体验（可选）

选择 Turnstile 或 reCAPTCHA，填写 Site Key、Secret 和允许访问的域名。配置齐全且访问域名匹配时，页面显示“验证体验”入口；缺少配置时隐藏入口。

| 提供商       | 配置项                                                          |
| ------------ | --------------------------------------------------------------- |
| Turnstile    | `TURNSTILE_SITE_KEY`、`TURNSTILE_SECRET`、`TURNSTILE_HOSTNAMES` |
| reCAPTCHA v3 | `RECAPTCHA_SITE_KEY`、`RECAPTCHA_SECRET`、`RECAPTCHA_HOSTNAMES` |

本地开发：把[配置示例](docs/config/challenges.env.example)复制到根目录 `.dev.vars`，填写密钥并重启。文件存在时编辑原文件。域名用逗号分隔，填写格式为 `example.com`，提供商控制台需要允许对应域名。

线上部署：在 Worker → Settings → Variables and Secrets 填写配置，或执行 `pnpm exec wrangler secret put 名称`。使用配置文件时，把 `.secrets.example` 复制为 `.secrets.production.env`，填写后运行：

```bash
node scripts/sync-worker-secrets.mjs production --check
node scripts/sync-worker-secrets.mjs production
```

脚本上传非空项，保留已有 Secret，跳过缺失的可选文件。敏感文件在 Git 忽略列表中。Secret 应放在 Worker 配置中，不能放进 `VITE_*`。`/api/browser/challenges` 的 `configured` 字段用于检查配置结果。

reCAPTCHA 使用 v3 评分型密钥。服务端校验 hostname、`browser_check` action 和 score，通过阈值为 0.5。v2 复选框和 Enterprise assessment 不在支持范围内，生产环境不接受 localhost。

## 项目结构与数据来源

- `src/app.css`：界面样式；`src/components/ui`：shadcn/ui 组件。
- `src/views`：网络、浏览器、AI 与状态页面；`public/worker`：Worker API。
- Net.Coffee：IP 详情，展示字段取决于接口返回。
- Globalping：全球测量；IANA / RDAP：注册资料；各平台官方状态源：运行状态。
- FingerprintJS 与 CreepJS：浏览器检测，模块说明见 [vendor/browser-diagnostics](vendor/browser-diagnostics/README.md)。

欢迎提交 Issue 和改进建议。分享截图前，请遮盖 IP、位置和指纹标识等隐私信息。

### 人机校验与 Claude 环境对照

人机校验在页面打开后自动运行，展示校验阶段、Turnstile 是否出现交互、reCAPTCHA v3 分数及本站阈值（0.50）。单轮最多等待 45 秒，可重新开始；结果仅代表本站本次校验。

可选的第二个 Turnstile 组件使用 `TURNSTILE_NONINTERACTIVE_SITE_KEY`、`TURNSTILE_NONINTERACTIVE_SECRET`、`TURNSTILE_NONINTERACTIVE_HOSTNAMES`。需在 Cloudflare 为该独立组件选择 **Non-interactive** 模式，域名须匹配；未配置时不显示。原有 `TURNSTILE_*` 组件保持其控制台配置。前端参数不能把同一个 Key 切换成另一种组件模式。

Claude 页面自动比较 `claude.ai` 与 `claude.com` 出口，并展示 DNS、WebRTC 和语言、时区等浏览器信息。检测失败、不同出口或中文偏好均不直接代表账号风险。未接入 Cloudflare 企业版 Bot Management；不展示推算的企业版分数。

Claude 页面还内嵌自动人机校验，并本地检测简繁中文字体、厂商字体、UA / Client Hints、Intl 区域及 Canvas 国旗渲染。检测字典参考 LinXiaoTao/FuckClaude，来源摘要与 MIT 许可证位于 `vendor/claude-environment/`。不使用其风险分数；不把字体、厂商或中文偏好解释为国籍或封禁概率。页面仅展示简洁人机状态和逐项更新的检测日志，不提供评分卡或文本输入。
