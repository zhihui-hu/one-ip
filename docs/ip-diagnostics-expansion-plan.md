# One IP 多源检测与多运行时对照方案

## 1. 背景与目标

当前项目是一个“浏览器侧探测 + Cloudflare Worker API + 多来源数据整理”的网络诊断工具箱。

现有功能已经可以完成以下工作：

- 探测国内出口、海外出口和 IPv4 / IPv6。
- 查询 IP 归属地、ISP、ASN、网络类型和信誉信息。
- 按网站或服务观察不同出口 IP。
- 检测网站连通性、DNS、WebRTC、浏览器指纹和全球 Ping。
- 在 Worker 中提供 IP 健康度、归属地、WHOIS、状态和挑战验证接口。

新增的一批网站不能简单地全部追加到 `src/views/home/sites.json`。这些网站的性质不同：有些是纯 IP API，有些是完整网页，有些是风控或泄露检测站点。它们的 CORS、响应格式、频率限制和隐私行为也不一致。

本次扩展的目标是：

1. 建立可维护的多来源检测注册表。
2. 将不同来源的结果清洗成统一模型。
3. 用来源数量和运行时差异帮助用户理解结果，而不是简单给出一个未经解释的“最终 IP”。
4. 同时支持网页、终端和 App 场景的出口对照。
5. 重新设计结果页面，让用户先看到结论，再查看来源和异常细节。
6. 控制第三方请求数量、隐私暴露、超时和错误影响。

首个可交付版本（阶段 0～3）只承诺“浏览器观察 + 终端导入 + 可解释聚合”，阶段 2～3 提供必要的状态和对照界面。完整结果页重设计、App 手工记录和风控站点入口在阶段 4～5 交付。网页不尝试自动探测 App 的网络路径，风控网站只提供手动入口。

## 2. 当前代码基础

现有的接入点如下：

- `src/views/home/sites.json`：网站分流和出口来源清单。
- `src/views/home/api.ts`：实现 `cftrace`、`ip-json`、`ip-text`、响应头等读取方式。
- `src/views/home/split-results.tsx`：并发执行来源检测，按 IP 去重并补充地理信息。
- `src/views/home/exit-groups.tsx`：按出口 IP 分组、展示站点数量和地图。
- `src/lib/network.ts`：统一的 `fetch`、超时、文本、JSON、headers 和 `no-cors` 请求封装。
- `src/views/ip/api.ts`：直接查询 Net.Coffee 并校验返回 IP 与目标一致。
- `src/views/ip/coffee.ts`：将 Net.Coffee 响应转换为统一的 IP、Geo 和 Risk 结构。
- `public/worker/index.js`：Worker API 总入口、同源校验、方法校验、限流和错误映射。
- `public/worker/http.js`：公网 IP、域名校验、上游超时、响应大小限制和错误转换。
- `public/worker/ip-health.js`：已有的终端友好型 IP 健康度 API。
- `tests/`：已有首页出口、连通性、IP 健康度和 Worker 行为测试。

当前 `SplitResults` 在容器进入视口后会将所有来源设置为可见并启动查询，`useQueries` 也没有全局并发上限。如果把几十个新网站直接加入清单，会导致首次检测请求数过多，因此需要先引入请求队列和默认来源预算，而不是只增加 `staleTime`。

## 3. 来源分类

### 3.1 自动检测型 IP 来源

这类来源返回纯 IP 或结构化 JSON，可以参与自动检测和多源一致性统计。

候选来源包括：

- `ipify.org`
- `ip.sb`
- `ipwho.is`
- `ip-api.com`
- `ipapi.co`
- `ipapi.is`
- `ifconfig.me`
- `icanhazip.com`
- `ident.me`
- `ifconfig.co`
- `jsonip.com`
- `geojs.io`
- `ipinfo.io`
- `ip.net.coffee`
- `cip.cc`
- `ipw.cn`

以上只是候选域名，不代表已存在可用的免费、HTTPS、免密钥或支持 CORS 的 endpoint。分类以实际 endpoint 为单位：同一站点的纯 IP、带目标参数的查询和 HTML 页面可能属于不同类别。每个来源在加入默认检测前，都必须完成阶段 0 的验证，无法在浏览器读取的 endpoint 可以标记为仅终端支持或手动链接。

### 3.2 网页型 IP 查询站

这类站点通常返回完整 HTML，可能包含脚本、验证码、Cookie 或反爬策略，不适合由浏览器自动抓取。

候选来源包括：

- `whatismyip.com`
- `whatismyipaddress.com`
- `ipaddress.com`
- `ipchicken.com`
- `showmyip.com`
- `ip.me`
- `db-ip.com`
- `maxmind.com`
- `ip2location.com`
- `ping0.cc`
- `ip138.com`
- `ipip.net`
- `ip.tool.chinaz.com`
- `ip111.cn`

这些来源在产品中以“打开原站”或“手动检测”呈现，默认不进入批量自动探测。

### 3.3 风控和泄露检测站

这类站点检测的不是单一 IP，而是 IP 信誉、浏览器指纹、DNS、WebRTC、代理、自动化特征或泄露风险。

候选来源包括：

- `scamalytics.com`
- `ipleak.net`
- `browserleaks.com`
- `browserleaks.io`
- `whoer.net`
- `dnsleaktest.com`
- `ipqualityscore.com`
- `abuseipdb.com`
- `ipvoid.com`
- `pixelscan.net`
- `bewild.ai`
- `wildai.net`

这些站点不应被当作普通 IP API 批量抓取。它们应进入独立的“风控 / 泄露检测”区域，提供说明、外部链接和项目已有的本地 DNS、WebRTC、浏览器检测入口。

## 4. 统一来源注册表

保留当前 `Site` 和 `sites.json`，通过兼容转换层生成来源定义。阶段 1 不迁移 UI 字段；后续页面改造完成后再移除兼容层，避免同时维护两份可编辑来源清单。一个来源 ID 对应一个具体 endpoint 和地址族策略，IPv4 与 IPv6 专用 endpoint 使用不同 ID。

```ts
type SourceDefinition = {
  id: string;
  name: string;
  kind: "site-egress" | "ip-api" | "geo" | "risk" | "leak" | "manual";
  groups: string[];
  targetRegion: "global" | "domestic" | "unknown";
  method:
    | "ip-json"
    | "ip-text"
    | "headers"
    | "cftrace"
    | "worker-api"
    | "external-link"
    | "unsupported";
  execution: "client-request" | "worker-fixed-upstream" | "link-only";
  runtimes: Array<"browser" | "terminal">;
  endpoint?: string;
  requestMethod?: "GET" | "HEAD";
  adapterId?: string;
  icon?: string;
  enabledByDefault: boolean;
  timeoutMs?: number;
  addressFamily: "ipv4" | "ipv6" | "dual-stack" | "unknown";
  providerFamily?: string;
  rateLimitNote?: string;
  unavailableReason?: string;
  validationId?: string;
  parserVersion?: string;
  privacyNote?: string;
  sourceUrl: string;
};
```

兼容转换必须覆盖以下映射：`url` / `domain` 转成完整 endpoint；`type` 转成 `targetRegion`；`extra` 转成 `groups`；`note` 转成 `unavailableReason`。`netease` / `bytedance` 转为明确指定响应头的 `headers` 适配器；现有 `ip-text` 中的 HTML 提取使用独立适配器，不能套用纯 IP 文本解析器。未知方法应返回 `unsupported`，不能回退到网易 endpoint。UI 和 query key 改用稳定 ID，不再以翻译后的名称作为标识。

来源注册表应成为以下内容的单一事实来源：

- 浏览器自动探测列表。
- 终端脚本的稳定来源列表。
- 结果页中的来源名称、分组和外部链接。
- 测试 fixture 的来源 ID。
- 说明文档和隐私提示。

浏览器代码和终端脚本从相同的 JSON 清单生成，脚本嵌入已验证来源子集与清单版本，不在执行时下载或执行新的来源配置。`validationId` 指向阶段 0 的验证记录；默认来源必须有对应记录。

网页型和风控型来源仍然可以放在同一注册表中，但必须通过 `execution: "link-only"` 明确禁止自动抓取。`worker-fixed-upstream` 只能访问编译期注册的 HTTPS 主机，不能接受用户传入的 URL；不得实现通用开放代理。

注册表在构建时必须校验：`id` 唯一、URL 为 HTTPS、`method` 与所需字段匹配、默认来源数量不超过预算、`link-only` 不得启用自动探测、新增默认来源启用的运行时已有验证记录。阶段 1 的旧来源兼容条目可以保留未验证状态，阶段 2 默认集合全部按准入规则选取。Worker 来源还必须匹配固定上游配置，禁止由浏览器传入 endpoint、主机或请求头覆盖该配置。

## 5. 统一结果模型

来源适配器不直接把第三方响应交给 UI，而是先转换成统一结果：

```ts
type DiagnosticResult = {
  schemaVersion: 1;
  runId: string;
  sourceId: string;
  runtime: "browser" | "terminal" | "app";
  execution: "client-request" | "worker-fixed-upstream" | "user-provided";
  subject: "caller-egress" | "lookup-target" | "worker-egress";
  provenance: "observed" | "declared" | "imported";
  verified: boolean;
  ip?: string;
  version?: 4 | 6;
  latencyMs?: number;
  details?: Array<{
    sourceId: string;
    capturedAt: string;
    geo?: Geo;
    risk?: Risk;
  }>;
  status:
    | "ok"
    | "timeout"
    | "network_error"
    | "http_error"
    | "rate_limited"
    | "parse_error"
    | "invalid"
    | "unsupported"
    | "cancelled";
  httpStatus?: number;
  errorCode?:
    | "timeout"
    | "dns_error"
    | "tls_error"
    | "cors"
    | "http"
    | "rate_limit"
    | "invalid_ip"
    | "invalid_payload"
    | "aborted";
  rawIp?: string;
  capturedAt?: string;
  receivedAt: string;
};
```

`Geo`、`Risk` 引用现有 `src/lib/types.ts`，保留 `country_code`、坐标等旧字段。适配器将 ASN 的十进制字符串或 `AS` 前缀字符串转成经过范围检查的整数，非法值留空；旧 UI 通过边界转换读取统一结果。补充查询写入 `details`，不能覆盖出口观察的 `sourceId`；只有 `subject: "caller-egress"` 可以进入客户端出口统计。

`client-request` 只表示请求由浏览器或终端发起，不代表网络未经过代理。`verified` 仅表示本页实际发起并读取了响应，不保证第三方内容真实。所有导入结果由解析器强制设为 `verified: false`，不能信任输入中的同名字段；只做格式校验不能提升可信度。没有来源或时间的 App 手工记录使用内置 `manual` 来源，省略 `capturedAt`，由本页记录 `receivedAt`。

统一清洗规则：

- 规范化 IPv4、IPv6 和 IPv4-mapped IPv6，并同时保留 `rawIp`；`ip` 用作统一聚合键和默认展示值，`version` 从规范化结果得出，不代表底层连接协议族。
- 使用一个共享的 IP 解析器验证地址。公网出口结果拒绝私有、回环、链路本地、文档示例和其他保留地址；WebRTC 等局域网诊断仍可单独保留这些地址。
- 将空字符串、未知字段和非法数字转成 `undefined`，不能伪造为零值。
- 浏览器 `fetch` 的通用 `TypeError` 无法可靠区分 DNS、TLS、CORS 和内容拦截，统一记为 `network_error`，提示可能原因。只有运行时提供明确证据时才填写具体 `errorCode`；HTTP 状态仅在响应可读时记录，不能推测隐藏的 429。
- 对同一 IP 做去重，但保留所有观察来源。
- 对地理、ISP、ASN 和信誉字段保留来源归属，不把单一来源字段伪装成共识。
- 地理查询返回目标 IP 时，先规范化并校验其与待补充 IP 一致；不一致就报无效响应，不能把目标 IP 强行覆盖到返回数据上。
- 为每次检测记录 `capturedAt`、运行时、来源 ID 和 schema 版本，避免混淆旧结果与新结果。

## 6. 多源聚合规则

聚合结果应区分“观察事实”和“解释结论”。

### 6.1 IP 观察集合

对同一轮、同一运行时、同一地址族中 `status: "ok"` 且 `subject: "caller-egress"` 的结果按规范化 IP 分组。浏览器统计只包含本页实际采集的结果，终端导入单独展示为“导入报告”，不合并进浏览器统计。

- 记录每个 IP 被哪些来源观察到。
- 记录 IPv4 和 IPv6 各自的来源数。
- 一致比例为“观察到该 IP 的成功来源数 / 当前组全部成功来源数”。同一来源重复响应只保留本轮最后一次有效观察；失败、取消、未启用、手工输入不进入分母，另列成功数 / 尝试数。
- 不做供应商权重评分，分别展示 endpoint 数和已确认的 `providerFamily` 数。同族 endpoint 不算作多个独立供应商；同族出现不同 IP 时保留全部事实，未知家族不声称独立。共用 CDN 不等于同一观察目标，仍保留站点分流视图。
- 标记仅单一来源、多个来源冲突、IPv4 / IPv6 双栈差异。
- 没有成功来源时比例为空，不能显示 0% 安全或默认 IP；并列最多时不选出“最终出口”，按目标不同返回多个 IP 也不等于检测出错。

### 6.2 地理和网络信息

- 地理信息显示来源数量和冲突字段。
- 城市、ISP 和 ASN 不一致时显示“来源差异”，不强行合并。
- Net.Coffee、ip-api、ipinfo 等信誉字段各自保留来源标签。
- 信誉分和住宅 / 机房 / VPN 等标签不能由 IP 地理结果推断。
- 默认只利用观察响应已包含的信息，不额外请求地理数据。用户展开归属详情后，按 `(详情来源 ID, 规范化 IP)` 去重查询；多源比较必须保留每份 `details` 的出处。

### 6.3 运行时对照

跨运行时先检查可比条件，再显示差异：

- 自动配对要求相同 `sourceId`、endpoint / 地址族策略版本一致、时间差不超过 5 分钟。仅名称或分类相同不够；用户还需确认设备和网络场景可比，否则只并排显示。
- 浏览器与终端 IP 相同或不同。
- 实际地址族不同时只显示“协议族差异”，不计算为同族 IP 冲突；代理、DNS64 等情况下实际返回地址族可能与请求选项不同。
- 代理或 VPN 只作为用户声明的网络路径，不作为网页自动推断结果。
- 终端 JSON 导入可以参与带有“用户提供”标签的配对对照，但不能证明其来源真实，也不能增加浏览器一致性统计中的来源数。超时窗口、缺少时间或未来时间异常时显示“无法直接比较”。
- App 结果由用户手动录入时使用 `provenance: "imported"`、`verified: false`，并显示原始来源和录入时间。

页面应该使用“观察到的差异”措辞，不能仅凭两个出口不同就断言存在泄露或封禁风险。`国内`、`海外`首先表示目标站点分组，不表示 IP 地理位置或网络线路；相关文案应写成“按目标站点分组观察到的出口差异”。

## 7. 浏览器、终端和 App 的边界

### 7.1 浏览器检测

浏览器向第三方来源发起 HTTP 请求，记录该服务所看到的请求出口。结果可能受代理、扩展、DNS、IPv4 / IPv6、缓存和内容拦截影响。WebRTC 是另一类网络观察，必须单独记录，不能当作 HTTP 出口证据。

### 7.2 终端检测

增加“终端检测”入口，提供：

- POSIX shell 脚本。
- PowerShell 脚本。
- 可复制的最小命令。
- JSON 和文本两种输出。
- 粘贴结果后在浏览器本地解析。

已有接口可以作为第一阶段入口。纯出口使用 `/api/me`；`/api/ip/health` 同时依赖 Net.Coffee，适合作为可选信誉详情：

```bash
curl -fsS --connect-timeout 3 --max-time 5 'https://你的域名/api/me'
curl -fsS --connect-timeout 3 --max-time 12 'https://你的域名/api/ip/health?format=text'
curl -fsS --connect-timeout 3 --max-time 12 'https://你的域名/api/ip/health'
```

这两个接口中的调用者 IP 来自 Cloudflare 接入请求；`/api/me` 的地理字段也来自 Cloudflare，健康度接口的地理和信誉数据来自 Net.Coffee。Net.Coffee 没有独立观察一次终端出口。带 `?ip=` 的健康度查询属于 `lookup-target`，不得用于出口统计；孤立的旧健康度响应无法证明是否传过目标参数，只作为查询详情导入，受控脚本记录了请求上下文时才可识别调用者观察。保留现有 API 响应结构，用专用导入适配器映射 `checked_at` 等字段，不修改已有 API 的字段契约。本地开发没有真实访客 IP 时保留已有 503 行为。

脚本只使用稳定的 IP / JSON 来源，不自动打开风控网页。基础命令应覆盖以下已在来源验证表中确认可用的来源（命令仅作示例）：

```bash
curl -4 -fsS --connect-timeout 3 --max-time 3 'https://api4.ipify.org?format=json'
curl -6 -fsS --connect-timeout 3 --max-time 3 'https://api6.ipify.org?format=json'
curl -fsS --connect-timeout 3 --max-time 3 'https://ipinfo.io/json'
curl -fsS --connect-timeout 3 --max-time 3 'https://ipwho.is/'
```

默认生成脚本仅包含验证通过的 endpoint，不承诺上述示例在所有网络中可用。POSIX 版本明确依赖 `curl` 和 `jq`；PowerShell 版本以 PowerShell 7、`curl.exe` 和 `ConvertTo-Json` 为基线，避免旧版 `curl` 别名差异。JSON 用结构化工具生成，单来源失败仍输出失败记录，诊断 JSON 写入 stdout，日志写入 stderr。

机器输出使用 `{ schemaVersion, registryVersion, runId, startedAt, finishedAt, results }` 信封，其中 `results` 使用第 5 节模型；记录观测时间，不以粘贴时间冒充检测时间。通用导入入口只接受版本化 JSON。文本用于人读，现有健康度文本如需兼容只走固定格式适配器，缺少检测上下文时不参与自动配对。

后续可以支持：

```bash
HTTPS_PROXY=http://127.0.0.1:7890 ./terminal-check.sh
curl --interface '网卡名' ...
```

脚本默认继承执行环境中的代理配置，并把“默认 / 显式代理 / 指定网卡”记录为用户声明，禁止导出代理凭据。`curl -4/-6` 在代理场景中可能仅约束到代理的连接，必须校验返回 IP 的地址族；`--interface` 也不能证明绕过 VPN。第一版不承诺自动判断实际代理路径。

### 7.3 App 检测

网页无法直接确定某个 App 的出口。App 可能使用独立代理、VPN 分流、独立 DNS、QUIC 或自有网络库。

App 场景采用“对照检测”而不是网页内自动检测：

1. 用户在 App 内复制其诊断结果，或手动填写出口 IP、来源和时间。
2. 页面通过专用表单或版本化 JSON 在浏览器本地校验，不解析任意 App 日志。
3. 页面将网页、终端和 App 结果并列展示。
4. App 结果始终标记为用户提供、未验证，不进入浏览器来源统计；缺少来源 ID 或时间时只允许人工对照。设备上的终端脚本结果仍归类为终端，不能冒充 App 观察。

## 8. 结果页面重设计

页面采用“先结论，后证据”的布局。

### 8.1 顶部结论区

显示：

- 当前检测时间。
- 浏览器观察到的 IPv4 / IPv6。
- 终端观察到的 IPv4 / IPv6。
- 来源一致数量和冲突数量。
- 按目标站点分组观察到的出口是否不同。
- 是否存在运行时差异。

### 8.2 运行时切换

提供四个视图：

- 网页检测。
- 终端检测。
- App 对照。
- 差异分析。

### 8.3 来源分组

默认启用 4～6 家已验证供应商，每轮最多 8 个 endpoint（IPv4 / IPv6 专用 endpoint 分别计数），其他来源由用户选择后加载：

- IP 观察来源。
- 归属与信誉。
- 国内来源。
- 风控与泄露检测。
- 手动打开的外部站点。

每条来源显示：

- 来源名称和图标。
- 观测到的 IP。
- IPv4 / IPv6。
- 响应状态。
- 延迟。
- 国家、城市、ISP、ASN。
- 检测时间。
- 打开原站链接。

### 8.4 差异提示

使用明确、可解释的提示：

- 多数来源观察到同一 IP。
- 该 IP 只有一个来源观察到。
- 浏览器和终端使用不同出口。
- 浏览器和终端使用不同 IP 协议版本。
- 归属信息存在来源差异。
- 请求失败，可能与跨域策略、内容拦截或连接异常有关；仅在读到 429 时显示限流。

结果页不应把“检测失败”渲染成“网站不可用”，也不应把单一风控站的结论渲染成项目自己的风险评分。

## 9. 请求和性能策略

以下参数从阶段 2 的新检测流程开始执行；阶段 1 先交付调度能力和 4 请求并发上限，仍可让旧清单排队执行。阶段 0 可依据来源约束收紧参数，放宽参数需要同步修改测试和验收标准：

| 项目               | 第一版约束                                                          |
| ------------------ | ------------------------------------------------------------------- |
| 默认核心观测       | 4～6 家供应商，最多 8 个 endpoint                                   |
| 用户发起的扩展检测 | 每轮最多 24 个 endpoint，更多来源另开批次                           |
| 全局并发           | 同一浏览器诊断调度器最多 4 个在途请求，覆盖首页、分流和详情查询     |
| 超时               | 排队不占单请求时限；发起后 3 秒，单轮总时限 20 秒（含排队）         |
| 详情预算           | 默认无额外地理请求；每次展开操作最多 2 家详情来源，仍受全局并发限制 |
| 响应大小           | IP 观察响应最多 64 KiB，地理 / 信誉响应最多 256 KiB                 |
| 重试与限流         | 无自动重试；可读的 429 按 `Retry-After` 冷却，缺省 60 秒            |

适配器通过共享调度器运行，不能仅在 `useQueries` 中同时设置 `enabled: true`。使用现有 `pool` 前需补齐取消和逐项失败隔离，不能让一个异常中止整个批次。每轮持有 `runId` 和 `AbortController`；取消时同时停止在途请求及队列，最后一个订阅者离开时取消无人使用的检测。重测先取消旧轮，迟到响应不得覆盖新轮。

`IntersectionObserver` 只负责已选来源的可见性，不负责授权，也不能把清单中的所有来源自动加入队列。运行状态区分 `idle / queued / running / completed / cancelled`；未启用的来源不能显示成“正在检测”。首页和分流页共享观测，避免导航后重复发送同一请求。

缓存仅存当前浏览器内存，`staleTime` 为 60 秒；HTTP 请求使用 `cache: "no-store"`，关闭窗口后不保留导入报告。稳定 query key 包含 schema / 清单版本、来源 ID、运行时和地址族策略，`runId` 用于结果归属及防止迟到覆盖，不通过不断增加 query key 积累旧轮缓存。详情缓存按 `(详情来源 ID, 规范化 IP)` 去重。手动重测取消并重置对应 query family，保留其他工具的查询。

终端脚本使用相同的核心来源与单来源时限；第一版可串行执行并接受更长总耗时，JSON 必须为超时和取消保留独立状态。网页型和风控型来源不加入任何默认批量请求。

## 10. 隐私和安全边界

页面应在检测入口附近明确提示：启用一个来源后，用户 IP、User-Agent 或请求元数据可能会发送给该第三方。CORS 失败不等于请求未发出；因此隐私提示不能只针对读取成功的来源。

必须遵守以下边界：

- 不在 Worker 日志中记录访客 IP、完整 URL、凭据或上游响应体。
- 保留现有健康度 API 的来源字段、状态和评分区间，只在新 UI 标注它是供应商数据的映射；新聚合器不据此计算跨来源综合评分。调整已有评分规则需要另立兼容性变更。
- 不使用 Worker 代理结果冒充浏览器真实出口。
- 第一版不新增通用 Worker 代理；继续使用现有固定 API。未来增加上游时，协议、主机、端口、路径模板及重定向目标都要受固定配置约束；默认拒绝重定向，输入 IP 只作为经过公网校验的参数，返回结构化字段而非任意上游内容。
- 扩展多源检测在用户选择来源并启动后才执行，执行前可见来源数和数据用途。旧首页自动检测策略的迁移在阶段 2 明确发布，不能在阶段 1 隐式扩大第三方请求范围。
- 归属详情按需查询；导入报告不得自动触发 IP 地理查询、远程图标、预览或其他上传请求。用户主动请求补充信息时提示目标 IP 会发送给哪些服务。
- 浏览器第三方探测默认使用 `credentials: "omit"`、`referrerPolicy: "no-referrer"`；来源与适配器不得请求无关权限。外部图标优先使用本地资源，避免用户未启用来源就产生额外第三方请求。
- 不自动批量访问需要用户交互的风控页面。
- 不将缺失字段解释为 `false` 或“未发现风险”。
- 不把第三方商业评分重新包装成 One IP 的官方判断。
- 终端粘贴结果默认只在浏览器本地解析，不自动上传。第一版限制为 256 KiB、128 条结果、单字符串 2 KiB，schema 中的对象字段使用白名单，拒绝未知版本和不匹配的字段类型。未知来源只能保留为未验证的手工记录，不注册新的 endpoint。
- 本页设置 `receivedAt`，导入的 `capturedAt` 必须是有效时间；缺失、异常或超出配对窗口的时间不得用当前时间补齐。禁止执行输入中的代码、命令、HTML 或 URL。
- 对外部链接使用新窗口、`rel="noopener noreferrer"`、明确来源和隐私说明；URL 只来自注册表，不使用导入字段构造可执行链接。

## 11. 分阶段实施

### 阶段 0：来源验证和清单整理

- 产出 `docs/source-validation.json`、脱敏响应 fixture 和固定清单校验器，不修改 UI。
- 每条记录包含来源 / endpoint ID、完整 HTTPS URL、GET / HEAD 方法、响应格式与 IP 含义、支持的运行时和地址族、CORS 及可读响应头、密钥要求、限流 / 使用条款链接、供应商家族及证据、隐私用途、验证时间、环境和结论。
- 使用实际浏览器从项目 origin 验证成功响应、错误响应及自定义响应头；`curl` 成功或单独存在 CORS 响应头不能代替浏览器可读性验证。记录 Chrome / Firefox / Safari 的实际覆盖，未验证浏览器不声称支持。
- 默认候选准入要求：在声明支持的运行时和地址族上完成至少 3 次跨越 24 小时的低频验证且全部可解析，最后一次验证距发布不超过 7 天。结果仅说明该参考环境下通过，不保证用户网络实时可用；验证请求遵守供应商限流。
- 按 endpoint 标记 `candidate / verified / disabled / manual`，未验证来源保持候选状态；准入数量不足时先交付已验证子集，不绕过 HTTPS 或 CORS 来凑数。CI 只读取记录和 fixture，不发真实请求。

### 阶段 1：统一数据层

- 新增来源注册表。
- 保留 `Site` 到 `SourceDefinition` 的兼容转换，保留现有来源、分类、不可用原因、地图所需字段和外部链接。
- 新增解析器和统一结果模型。
- 把现有 `detectSite()` 改为适配器调用。
- 增加 IP 规范化、状态分类、去重和冲突计算。
- 增加显式请求队列、整体取消和请求预算，覆盖首页主出口、分流与新详情请求。
- 此阶段保持现有页面与接口契约，只改变调度实现；新增来源选择和默认数量变更在阶段 2 显式发布。

### 阶段 2：接入核心自动来源

从阶段 0 验证通过、无需密钥、返回纯文本或 JSON 的候选中选择首批来源。优先调查列表为：

`ipify`、`ip.sb`、`ipwho.is`、`ifconfig.me`、`icanhazip.com`、`ident.me`、`ifconfig.co`、`jsonip.com`、`geojs.io`、`cip.cc`、`ipw.cn`。

默认选择 4～6 家已确认供应商，最多 8 个 endpoint；保留旧站点目录，但只检测用户选中的批次。国内目标和 IPv4 / IPv6 覆盖情况按验证事实展示，不强行宣称双栈可用。

此阶段交付最小可用的来源选择、启动 / 取消、逐项状态和来源统计界面。已有首页卡片字段和旧站点分类继续可用，默认请求范围的变化作为明确的产品行为变更记录，不以“完全不变”掩盖。

### 阶段 3：终端检测

- 增加 `terminal-check.sh` 和 PowerShell 脚本。
- 增加终端检测说明页或 `/network/terminal` 路由。
- 提供 `/api/ip/health` 的 JSON / text 命令示例。
- 增加本地粘贴解析器和浏览器 / 终端对照表。
- 生成带清单版本的脚本和 JSON schema，实现本地导入限额、未知来源处理及不可比状态；验证导入后不会产生自动网络请求。
- 保持 `/api/me`、`/api/ip/health` 原有 JSON / text 契约，通过边界适配进入新模型。

### 阶段 4：结果页面重设计

- 重做首页 IP 结果卡片。
- 重做 `/network/exits` 的来源聚合视图。
- 增加运行时切换、来源详情、冲突提示和来源链接。
- 仅对满足来源 ID 和时间窗口条件的结果显示运行时对照。
- 在移动端使用垂直分组和底部抽屉，兼容现有明暗主题、国际化、IP 隐藏模式和紧凑布局。
- 对加载、部分成功、全部失败和取消状态提供独立视觉状态。

### 阶段 5：App 记录、风控和手动检测入口

- 将风控 / 泄露网站作为外部检测卡片。
- 增加 App 手工记录表单和未验证标签，禁止把设备终端结果重分类为 App 观察。
- 本方案不接入自动风控评分，也不把外部评分合并为 One IP 的评分。
- 复用现有 DNS、WebRTC、浏览器指纹和深度检测功能。
- 对需要交互、Cookie 或账号的服务只提供手动入口。
- 为每个外部站点展示数据用途和隐私提示。

## 12. 测试方案

### 单元测试

- IPv4 / IPv6 和 IPv4-mapped IPv6 规范化。
- JSON、纯文本、响应头和 Cloudflare Trace 解析器。
- 空值、非法 IP、错误字段和大数值处理。
- 原始 IP / 规范化 IP、ASN 字符串、旧 `Geo` / `Risk` 字段转换和详情来源归属。
- 同轮去重、双栈分组、同家族来源、未知家族、并列最多、零成功与未启用来源的分母。
- 浏览器 / 终端 / App 对照条件、5 分钟边界、未来和缺失时间、清单版本不匹配。
- 超时、取消、可读 429、无法区分原因的 `TypeError`、解析失败和部分成功；不能把模拟的浏览器网络异常断言为已证实的 CORS 错误。

### 集成测试

- 来源注册表到适配器的映射。
- registry schema 校验：唯一 ID、HTTPS、允许主机、默认数量、方法字段一致性。
- 使用可控的延迟 fetch 验证 4 请求并发上限、8 / 24 endpoint 预算、排队超时、取消不再出队、一个失败不阻断其他结果和旧轮迟到丢弃。
- `netease` / `bytedance` / HTML 文本 / `unsupported` 的兼容映射，以及首页与分流共享观测不重复发请求。
- 首页结果卡片和分流出口页面的分组渲染。
- POSIX / PowerShell 脚本在模拟 `curl` 响应下生成相同 JSON 契约，覆盖缺依赖、超时、单来源失败、代理地址脱敏及未知来源。
- 版本化 JSON 和已有健康度格式的专用导入适配器。
- 伪造 `verified: true`、超大输入、未知 schema、恶意 URL、过期时间和未验证结果不会进入浏览器来源统计；导入不触发补充请求。
- Worker `/api/ip/health` 的 IPv4、IPv6、错误和限流行为。
- 如新增 Worker 上游，则验证任意 URL / 请求头覆盖被拒绝、重定向被阻止、目标 IP 校验、响应大小及日志脱敏。
- 以桌面和移动端浏览器验证选源、取消、重测、导入、详情展开和主题切换，覆盖部分成功与全部失败；相关文本补齐国际化。

### 网络测试原则

- CI 不依赖实时第三方网站。
- 使用固定响应 fixture 和模拟 fetch。
- 真实来源只在本地或独立 smoke 脚本中验证。
- 记录来源验证时间，避免把临时可用性当作永久契约。

## 13. 交付方式

实现以可独立审查的变更交付，每份变更记录已完成阶段、行为变化、验证结果和剩余候选来源：

- 来源清单、兼容层和调度器。
- 核心来源与最小检测界面。
- 终端脚本、JSON 契约与本地对照。
- 完整结果页、App 记录和手动入口。

每个阶段完成后运行：

```bash
pnpm build
pnpm test
pnpm lint
```

## 14. 验收标准

首个可交付版本（阶段 0～3）应满足：

1. 数据模型区分网页、终端、App、查询目标及 Worker 出口，补充详情不覆盖 IP 观察来源。
2. 默认选择 4～6 家通过准入的供应商，最多 8 个 endpoint、4 个并发；扩展批次不超过 24 个 endpoint。未达来源准入数量时交付标记为候选试用，不声称完成来源覆盖。
3. 默认来源有阶段 0 的跨 24 小时验证记录与近期验证时间，CI 通过 fixture 验证解析；第三方临时不可用时正确降级。
4. 同一 IP 的 endpoint 数、供应商家族数、成功 / 尝试数及已知失败原因可见，未知原因不被推断成 CORS 或封禁。
5. 浏览器与终端仅在具体来源配置、时间差不超过 5 分钟及用户确认场景可比时显示配对差异；导入结果始终有未验证标签，其他情况显示“无法直接比较”。
6. 用户可以复制命令、执行终端检测并在页面本地粘贴解析。
7. 未启用、风控和手动来源不产生自动请求；默认无额外地理查询，导入不会自动发送 IP 给第三方。
8. 结果页面在桌面和移动端都能区分加载、成功、部分失败和阻断。
9. 第三方来源失败不会阻断其他来源，也不会制造虚假的“安全”结论。
10. 保留首页和 IP 详情字段、旧站点分类及 Worker API 契约，默认选源策略变化已记录；有意变化的交互更新对应回归测试，不要求原来全部自动请求的行为保持不变。
11. 不新增任意 URL 代理路径；新增 Worker 上游只由固定配置决定，重定向、输入和响应大小受约束。
12. 导入数据不自动上传，未知版本和超大输入被拒绝；未验证结果不进入浏览器一致性统计，但可作为带标签的终端对照。

阶段 4～5 另外验收完整结果页在桌面 / 移动、明暗主题、国际化和 IP 隐藏模式下可用；App 记录始终未验证，外部检测入口只有用户点击后才打开原站。
