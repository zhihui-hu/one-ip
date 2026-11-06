# <img src="public/icon.svg" alt="One IP Logo" width="32" height="32" /> One IP

<p align="left">
  <img src="https://img.shields.io/badge/React-19-282C34?logo=react&amp;logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&amp;logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&amp;logoColor=white" alt="TypeScript 6" />
  <img src="https://img.shields.io/badge/Cloudflare_Workers-F38020?logo=cloudflareworkers&amp;logoColor=white" alt="Cloudflare Workers" />
</p>

IP 查询、网络诊断、浏览器检测与 AI 服务状态工具箱。

**中文** · [English](README.en.md)

[在线体验](https://ip.huzhihui.com/) · [GitHub](https://github.com/zhihui-hu/one-ip)

![桌面首页（已打码）](docs/screenshots/desktop-home-redacted.png)

<table>
  <tr><th>手机 · 浅色</th><th>手机 · 深色</th></tr>
  <tr>
    <td><img src="docs/screenshots/mobile-home-light-redacted.png" alt="手机浅色首页（已打码）" width="360" /></td>
    <td><img src="docs/screenshots/mobile-home-dark-redacted.png" alt="手机深色首页（已打码）" width="360" /></td>
  </tr>
</table>

## 功能

- **当前 IP（首页）**：IPv4 / IPv6 归属地、运营商、ASN、信誉分与地图，IP 检测在新标签页打开
- **泄漏检测**：DNS 泄漏与 WebRTC 泄漏
- **网络解锁**：AI、流媒体及各地区网站的连通性与分流出口，含 ChatGPT、Claude 专项诊断
- **网站测速**：基于 Cloudflare 边缘网络的下载、上传与延迟测试
- **更多工具**：WHOIS、全球 Ping、浏览器指纹与环境一致性、服务状态
- 中英文、深浅主题、移动端适配；支持浏览器原生 [WebMCP](https://developer.chrome.com/docs/ai/webmcp/)

结果依赖第三方服务，可能受限流或跨域影响；IP 类型和信誉分仅供参考。

## 部署

一键部署到 Cloudflare：

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fzhihui-hu%2Fone-ip)

或 Fork 后在 Cloudflare **Workers & Pages** 导入仓库，构建命令 `pnpm build`，部署命令 `pnpm deploy`。基础功能无需任何 API Key。

Docker 自托管：

```bash
cp .env.docker.example .env.docker   # 可选配置
docker compose up -d --build         # 打开 http://服务器地址:8080
```

Cloudflare Pages、反向代理、天地图、人机验证、GitHub Actions 与 Fork 同步等配置见 [部署与配置](docs/deploy.md)。

## 本地开发

```bash
pnpm install --frozen-lockfile
pnpm worker:dev   # http://127.0.0.1:8787
pnpm build && pnpm test && pnpm lint
```

## 数据来源

Net.Coffee、ip-api、Globalping、IANA / RDAP、各平台官方状态源；浏览器检测使用 FingerprintJS 与 CreepJS（见 [vendor/browser-diagnostics](vendor/browser-diagnostics/README.md)），Claude 环境检测字典参考 [FuckClaude](https://github.com/LinXiaoTao/FuckClaude)（见 `vendor/claude-environment/`）。检测结果仅用于环境排查，不代表任何平台的官方判定。

欢迎提交 Issue。分享截图前请遮盖 IP、位置和指纹等隐私信息。

## 商务合作

提供闭源商业版本：企业授权、私有化部署、定制开发与 API 接入、技术支持。请通过 [ip@huzhihui.com](mailto:ip@huzhihui.com) 或微信联系，并说明使用场景与预计规模。

<details>
  <summary>微信联系（展开二维码）</summary>

  <img src="public/contact/wechat.jpg" alt="微信联系二维码" width="240" />
</details>

社区友链：[LINUX DO](https://linux.do/)

## Star History

<a href="https://www.star-history.com/?repos=zhihui-hu%2Fone-ip&amp;type=date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=zhihui-hu/one-ip&amp;type=Date&amp;theme=dark" />
    <img src="https://api.star-history.com/svg?repos=zhihui-hu/one-ip&amp;type=Date" alt="One IP 的 GitHub Star 历史曲线" width="640" />
  </picture>
</a>
