# React + Vite Starter

默认集成 TypeScript、React Router、shadcn/ui（Radix）、TanStack Query/Table、Zod、React Hook Form、Jotai 和 GSAP。

```sh
pnpm install
pnpm dev
pnpm build
pnpm preview
```

## 开发服务器

默认监听 `127.0.0.1:5173`，端口占用时直接报错，不自动打开浏览器。
`vite.config.ts` 中固定配置 `/api → http://localhost:3000` 代理，保留 `/api` 路径；不使用 `DEV_*` 变量。按实际后端修改配置。需要局域网访问时将 `server.host` 改为 `0.0.0.0`。开发代理不适用于生产部署。

## 路由与部署

使用 `BrowserRouter`，默认为 HTML5 History 路由，不使用 URL hash。
默认页面为首页 `/` 和关于 `/about`。新增页面放在 `src/views/<route>/index.tsx`，在 `src/App.tsx` 注册路由。`src/App.tsx` 只注册路由，导航、主题切换、构建信息和 Toast 由 `src/layout/index.tsx` 统一提供，通过 `Outlet` 渲染子页面。
生产服务器必须将非静态资源的页面请求回退到 `index.html`，否则刷新深层路由会返回服务器 404。

Nginx 示例：

```nginx
# 放在 server 块中；如已有 CSP，请合并 frame-ancestors 指令。
add_header Content-Security-Policy "frame-ancestors 'none'" always;
add_header X-Frame-Options "DENY" always;

location / {
  try_files $uri $uri/ /index.html;
}
```

API 路径应单独配置代理，不要回退到 HTML。静态资源缺失应返回 404。

## 移动端与嵌入限制

- viewport 支持安全区域，布局使用 `env(safe-area-inset-*)` 和动态视口高度。
- `touch-action: manipulation` 禁用双击缩放，保留双指缩放；移动端输入框至少 16px，避免 iOS Safari 聚焦自动放大。
- 包含 Safari 主屏幕、状态栏、浅深色浏览器外观和关闭自动电话号码等识别的 meta；这些不是完整 PWA 配置。
- 开发与预览服务发送禁止 iframe 嵌入的 CSP 和 X-Frame-Options 响应头。
- `public/_headers` 适用于支持该文件的静态托管平台；其他服务器必须按上例设置响应头。`frame-ancestors` 和 X-Frame-Options 不能通过 HTML meta 生效，HTML 脚本隐藏仅为兜底，不能替代响应头。

## 后台更新检测

`public/app-update-checker.worker.js` 是浏览器 Web Worker（不是 Service Worker），生产环境首次挂载时读取部署入口 `index.html` 的 ETag / Last-Modified 建立基线；之后仅在页面重新可见时复查，无定时轮询。检测请求在 Worker 中执行，不走版本接口。

- 优先 HEAD + `cache: no-cache`；服务器返回 405 / 501 时回退 GET 并取消响应体。
- ETag 或 Last-Modified 变化时显示更新提示，关闭不会刷新页面；确认刷新时保留当前路由、查询参数和 hash，添加 `t` 时间戳跳过旧缓存。
- Worker 和 HTML 地址支持 Vite `base` 子路径部署；状态使用 Jotai，提示使用 SweepShine 展示刷新中状态。
- 部署服务器需要为入口 HTML 返回稳定的 ETag 或 Last-Modified，并允许重新验证缓存。没有这些响应头时不会提示更新。
- 检测基于首次成功请求的基线：若页面加载前已拿到旧缓存，而首次检测时已部署新版，无法判断该页面已过期。请为 HTML 配置 `Cache-Control: no-cache`，静态 hash 资源可长期缓存。
- 开发环境不启动 Worker；未保存的输入不会被自动刷新打断。

## 脚手架创建流程

运行依赖、开发依赖及 Tailwind 前置依赖合并为一次安装，随后串行执行 shadcn 初始化与全组件安装。同一项目的安装任务不会并发，避免 `node_modules` 和 lockfile 冲突。
默认只显示阶段和耗时，省略第三方工具成功日志中的重复提示；使用创建 CLI 的 `--verbose` 查看完整日志。失败时会输出该步骤捕获的诊断日志。

## UI 与表格约定

- 初始化 shadcn/ui 后自动执行 `shadcn add --all --yes`，安装全部官方 UI 组件，再写入模板自定义组件。
- 表格统一使用默认依赖 `@tanstack/react-table` 管理列定义、排序、筛选、分页和行选择；使用 shadcn/ui 的 `Table` 组件渲染，不自行实现另一套表格状态。

## 默认功能

- BuildInfo 直接从 `package.json` 导入名称、版本，不定义 `VITE_APP_NAME` / `VITE_APP_VERSION`。`VITE_BUILD_TIME` 由 Vite `define` 注入 ISO 时间，无需在 `.env` 配置；生产环境为打包时间，开发环境为开发服务启动时间。使用 date-fns 按访问者本地时区格式化；页面紧凑显示 `yyyy-MM-dd HH:mm`，悬停显示带秒、时区偏移的完整时间及中文相对时间。控制台用彩色标签输出版本和时间，其他浏览器公开环境变量在默认折叠的表格分组中显示。不要在 `VITE_*` 变量中放置密钥。

- 导航使用 AnimatedSegmentedTabs（GSAP 动画），选中值从 URL 获取，通过 React Router 切换首页与关于页，支持浏览器前进/后退；方向键移动焦点，Enter/Space 确认切换。
- NProgress 顶部进度条统一监听 React Router 的 location，覆盖 Anim Tab、Link、程序跳转和浏览器前进/后退。默认不显示转圈图标，使用主题主色，支持减少动态效果。当前页面为同步加载，进度条是页面提交后的短暂切换反馈，不代表接口或异步资源加载进度。
- CookieConsentBanner 使用紧凑同行布局，确认状态写入 localStorage 和同名 Cookie；“说明”打开隐私对话框，不占用首页或关于页的内容。
- Cookie 提示与更新提示共用紧凑通知容器，留出内边距避免边缘被裁切；Cookie 提示使用轻边框、无阴影、小图标和同行确认按钮。
- SweepShine 提供文字和表面两种加载效果，CSS 统一在 `src/index.css`，减少动态效果偏好下不播放动画。
- 首页和关于页各保留一句介绍，不展示表单或功能卡片。整体为低对比背景上的单个无边框、无阴影面板，顶部是 Anim Tab 和主题按钮；表单与数据相关依赖仍默认安装，供后续开发使用。
- 默认使用 `components/theme/theme-toggle-button.tsx` 的紧凑日/月按钮；明暗两种方向都从实际点击位置向外扩散，键盘触发时从按钮中心扩散，不支持 View Transitions 或偏好减少动态效果时直接切换。主题持久化到 localStorage。
- 原 `ThemeToggle` 完整外观面板保留为可选组件，不再默认展示。
- Jotai Provider 位于入口，主题状态在 `src/store/theme.ts`；表单状态由 RHF 管理，服务端数据由 Query 管理。
- `@/*` 对应 `src/*`，已同时配置 TypeScript 路径映射和 Vite 别名，例如 `@/views/home`、`@/layout`。
- `src/index.css` 是唯一全局 CSS 入口：保留 shadcn CLI 生成的 Tailwind 导入和主题变量，生成器追加主色、圆角、字号、布局及移动端样式，不再单独使用 `appearance.css`。后续全局样式统一写在此文件。
- `index.html` 在模块脚本启动前恢复主题，并为 Internet Explorer 显示不支持提示；不提供 IE polyfill。
- `src/lib/request.ts` 提供请求封装，环境变量示例见 `.env.development` 和 `.env.production`。
