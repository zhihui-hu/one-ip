# 项目结构与优化实施记录

## 当前结论

项目保持 React/Vite SPA + Cloudflare Worker 架构。浏览器出口探测、指定地址资料查询和官方服务状态属于不同的观测对象，不能为了缓存或合并请求把浏览器探测移到 Worker。

本轮重点是减少首页依赖和请求量，并收敛来源执行契约。它不是整个项目已经完成重构的声明。

## 模块职责

| 模块                                                                      | 职责                                                   |
| ------------------------------------------------------------------------- | ------------------------------------------------------ |
| `src/App.tsx`、`src/layout`                                               | 路由、布局、页面懒加载                                 |
| `src/lib/network.ts`                                                      | HTTP 传输、超时、取消、优先级并发队列                  |
| `src/lib/diagnostic-source.ts`                                            | 来源判别联合、字段校验和旧来源配置转换                 |
| `src/views/home/sites.json`                                               | 50 个来源的显式稳定 ID 和配置                          |
| `src/views/home/source-registry.ts`                                       | 构造来源清单和按 ID 查找                               |
| `src/lib/source-probe.ts`                                                 | 按规范化来源执行单个浏览器探测，校验地址族和指定响应头 |
| `src/views/home/api.ts`                                                   | 来源调度、计时、Geo 补充和统一结果转换                 |
| `src/lib/diagnostics.ts`                                                  | IP 规范化、结果模型、错误分类、聚合和运行时对照        |
| `src/lib/diagnostic-import.ts`                                            | 本地报告解析，导入数据始终不视为已验证                 |
| `src/lib/query-keys.ts`                                                   | 共享查询标识和首页刷新范围                             |
| `scripts/terminal-sources.json`、`scripts/generate-terminal-manifest.mjs` | 编译期生成终端来源清单                                 |
| `src/views/status/loading.ts`                                             | 从查询完成状态派生加载批次                             |
| `public/worker/status-cache.js`                                           | 公开状态的 60 秒 Cache API 缓存                        |
| `public/worker/cloud-status.js`                                           | 云厂商状态适配，腾讯区域详情共享 4 路并发预算          |
| `src/components/toolkit.tsx`                                              | 轻量展示工具                                           |
| `src/components/data-table.tsx`                                           | 表格渲染与排序动画，调用页面直接引用                   |

## 已完成

- 修复非法 IPv6 和 `198.18.0.0/15` 地址判断。
- 前端与 Worker Geo 适配器校验上游返回 IP，拒绝地址不匹配。
- Geo 和国内出口的备用源具有独立超时，用户取消仍立即终止。
- 全局诊断并发上限保持 4，Geo 和主要出口任务具有较高优先级。
- 诊断结果保留 `latencyMs` 的总耗时语义，新增 `queueWaitMs`、`networkMs`、`totalMs`；导入支持这些可选字段。
- 所有来源 ID 固化在 JSON 中，地图、详情选择与 React key 使用 ID。
- 终端脚本使用构建生成的本地清单，只执行已准入的 `ip-text` / `ip-json` 来源，不在运行时下载配置。
- 分流 query key 包含 registry/parser 版本，来源配置或解析规则升级后不会复用旧缓存。
- 来源配置拒绝未知字段、非法 HTTPS URL、方法冲突；旧网易和字节方法转换为明确 URL 和响应头的 `headers` 适配器。
- 执行器采用穷尽式 switch，仅读取配置的响应头；link-only 来源不启动网络请求。
- 首页摘要只创建 8 个来源查询；分流详情页首批也是 8 个，其余显示待检测，可显式检测全部。
- 状态页默认每批启用 8 个服务，成功或失败都能推进下一批；无需用 effect 保存可派生的批次状态。
- Worker 状态缓存保留 `fetchedAt`，缓存读写失败退回普通查询；访客 IP、健康度、验证接口仍保持各自原有缓存策略。
- 腾讯云受影响区域详情请求共享最多 4 个并发，保留所有区域的结果语义。
- 分享二维码点击后加载；首页浏览器指纹接近视口才运行。
- DataTable 从 toolkit 拆出，首页不再预加载 TanStack Table。手工分包方案没有减少总资源，未保留该配置。

## 性能口径

使用 `node scripts/measure-initial-assets.mjs dist/index.html` 测量 HTML 直接引用的 JS、CSS 和 preload 文件，各文件单独 gzip 后求和。

- DataTable 拆分前约 293.6 KB，拆分后约 280.8 KB，减少约 12.8 KB，约 4.4%。
- 更早基线包含同步分享弹窗，总量约 300.1 KB。
- 单个入口仍约 568 KB，Vite 的 500 KB 单块告警仍存在。分包后应比较总资源，不能把单块告警消失当作性能收益。
- 该口径不包含路由动态依赖、图片、指纹运行成本和第三方请求，也不是 LCP 或真实网络耗时。

## 验证

- `pnpm build`：TypeScript 和生产构建。
- `pnpm test`：Worker 行为、来源校验、独立超时、取消、查询订阅、计时和批次推进；当前 174 项全部通过。
- `pnpm lint`：仍有既有组件 warning，状态页批次推进新增的 warning 已消除。
- 浏览器确认分享弹窗点击前没有加载对应 chunk，点击后出现弹窗；状态请求按批次推进，接口失败时保持未知状态。
- 本地完整入口使用 `pnpm worker:dev`，默认 `http://127.0.0.1:8787`。单独运行 Vite/preview 时，`/api` 仍依赖本地 Worker。

## 后续工作

1. 查询策略仍需进一步统一。部分 Geo 调用分别采用浏览器直连和 Worker 查询，统一 key 不能替代统一的数据获取策略。
2. 完整分流页的“检测全部”仍一次入队全部来源；可进一步按分类分批，并为刷新生成唯一运行 ID。
3. 报告导入和运行时对照逻辑尚未形成完整页面流程；终端来源清单已完成编译期生成。
4. 状态缓存还需在实际 Cloudflare 部署观察命中率；腾讯云区域详情已有并发预算，其他云厂商的上游扇出仍需分别评估。
5. 继续用浏览器依赖图评估英文文案和公共导航，而不是只按文件行数拆分。
6. 清理旧组件的 key、effect cleanup 和重复派生逻辑；共享 IP 分类规则仍可继续统一。

每一项按独立行为范围提交并验证，保持已有浏览器探测、Worker 查询和未知结果语义。
