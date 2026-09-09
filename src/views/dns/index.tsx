import { Explanation } from "@/components/explanation";
import {
  PageHeading,
  ActionButton,
  ErrorNotice,
  DataTable,
  IpText,
} from "@/components/toolkit";
import { useDiagnostic } from "@/hooks/use-diagnostic";
import { flag } from "@/lib/network";
import type { Geo } from "@/lib/types";
import type { ColumnDef } from "@tanstack/react-table";
import { runDns } from "./api";

const columns: ColumnDef<Geo>[] = [
  { id: "number", header: "#", cell: ({ row }) => row.index + 1 },
  {
    accessorKey: "ip",
    header: "DNS 解析器 IP",
    cell: ({ row }) => <IpText ip={row.original.ip} />,
  },
  {
    id: "geo",
    header: "归属地",
    cell: ({ row }) =>
      `${flag(row.original.country_code)} ${row.original.country ?? ""} ${row.original.city ?? ""}`,
  },
  { accessorKey: "isp", header: "服务商" },
  { id: "state", header: "状态", cell: () => "已观察到" },
];
const explanations = [
  {
    title: "DNS 泄露是什么？为什么你应该在意？",
    text: "访问域名前，设备需要向 DNS 解析器查询地址。如果你希望所有流量经过代理，但 DNS 查询仍由本地运营商处理，就可能暴露访问的域名。检测使用随机、不可缓存的子域名，在权威 DNS 端观察真正发起查询的递归解析器；不是读取浏览器 DNS 设置，也不是查询 Worker 的 DNS。",
  },
  {
    title: "发现 DNS 泄露了，怎么修？",
    text: "检查代理客户端是否接管 DNS 和 UDP，确认系统 DNS、浏览器安全 DNS 以及 IPv6 的路由是否符合预期。可选择可信的 DoH/DoT 服务，或让代理内置 DNS 处理解析。不要盲目关闭加密 DNS：它是否绕过代理取决于具体配置。修改后重新测试。",
  },
  {
    title: "为什么用了代理，DNS 还是会泄露？",
    text: "HTTP 代理、SOCKS 代理与 TUN 模式处理 DNS 的方式不同。系统解析、远端解析和浏览器 DoH 可能走不同的路由；IPv6 也可能绕过仅覆盖 IPv4 的规则。解析器地区与出口地区不同只是一条线索，不能独立证明泄露。",
  },
  {
    title: "DoH、DoT、普通 DNS 有什么区别？",
    text: "普通 DNS 通常使用 UDP/TCP 53，查询内容未加密；DoT 使用 TLS（通常端口 853）；DoH 将查询封装在 HTTPS（通常端口 443）中。加密保护传输链路，但所选解析器仍能看到查询，是否经过代理取决于路由。",
  },
  {
    title: "本项目的检测实现原理与配置",
    text: "SPA 向 Worker 申请短期检测会话，浏览器请求会话内的随机域名，再轮询权威 DNS 服务的解析器观测结果。Cloudflare Worker 不支持监听 UDP/53，因此需配置 DNS_BACKEND_URL、DNS_PROBE_SUFFIX 与可选的后端令牌。未配置时明确报错，不使用公共 DoH 查询冒充 DNS 泄露检测。",
  },
];
export default function DnsPage() {
  const query = useDiagnostic(runDns);
  return (
    <>
      <PageHeading
        title="DNS 泄露检测"
        description="知道吗？DNS 可能正在悄悄的暴露真实上网位置。一键检测，看看 DNS 有没有在背后出卖你的信息。"
      />
      <div className="feature-strip">
        <div>
          🔒<strong>权威 DNS 观测</strong>
          <small>真实解析器来源</small>
        </div>
        <div>
          ⚡<strong>快速检测</strong>
          <small>随机域名避免缓存</small>
        </div>
        <div>
          🎯<strong>交叉验证</strong>
          <small>快速 / 深度两种模式</small>
        </div>
        <div>
          🛡️<strong>隐私优先</strong>
          <small>短期会话，不建历史档案</small>
        </div>
      </div>
      <div className="center-actions">
        <ActionButton
          busy={query.isPending}
          onClick={() => query.mutate(false)}
        >
          快速测试
        </ActionButton>
        <ActionButton
          variant="outline"
          busy={query.isPending}
          onClick={() => query.mutate(true)}
        >
          深度测试
        </ActionButton>
      </div>
      <ErrorNotice error={query.error} />
      <p className="status-line" role="status">
        {query.isPending
          ? "正在触发 DNS 查询并收集解析器…"
          : query.data
            ? `发现 ${query.data.resolvers.length} 个解析器，请核对是否符合你的 DNS 配置。无结果不代表安全。`
            : "点击上方按钮，立即检测你的 DNS 是否安全"}
      </p>
      <DataTable
        data={query.data?.resolvers ?? []}
        columns={columns}
        empty="等待检测"
      />
      <Explanation items={explanations} />
    </>
  );
}
