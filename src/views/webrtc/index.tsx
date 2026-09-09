import { useState } from "react";
import { AnimatedValue } from "@/components/animated-value";
import { CountryFlag } from "@/components/country-flag";
import { LookupFaq } from "@/components/lookup-faq";
import {
  ActionButton,
  ErrorNotice,
  DataTable,
  IpText,
  Pending,
} from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { RtcResult } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { runWebRtc } from "./api";

const columns: ColumnDef<RtcResult>[] = [
  { id: "number", header: "#", cell: ({ row }) => row.index + 1 },
  {
    accessorKey: "ip",
    header: "IP 地址",
    cell: ({ row }) => <IpText ip={row.original.ip} />,
  },
  { accessorKey: "type", header: "类型" },
  {
    id: "geo",
    header: "归属地",
    cell: ({ row }) =>
      row.original.geo ? (
        <>
          <CountryFlag code={row.original.geo.country_code} />{" "}
          {row.original.geo.country ?? ""} {row.original.geo.city ?? ""}
        </>
      ) : (
        "未知"
      ),
  },
  {
    id: "state",
    header: "状态",
    cell: ({ row }) => (row.original.public ? "请核对出口" : "本地地址"),
  },
];
export default function WebRtcPage() {
  const [round, setRound] = useState(0);
  const query = useQuery({
    queryKey: ["webrtc-diagnostic", round],
    queryFn: ({ signal }) => runWebRtc(undefined, signal),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  return (
    <>
      <Card className="mb-3">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm">WebRTC 出口检测</CardTitle>
            <ActionButton
              size="sm"
              busy={query.isFetching}
              onClick={() => setRound((n) => n + 1)}
            >
              {query.isFetching ? "检测中..." : "重新检测"}
            </ActionButton>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div role="status">
            <AnimatedValue value={query.data?.verdict ?? query.isFetching}>
              {query.isFetching ? (
                <Pending>正在采集 ICE 候选地址...</Pending>
              ) : (
                (query.data?.verdict ?? "未完成检测")
              )}
            </AnimatedValue>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">HTTP 基准出口</span>
            {query.data?.baseline ? (
              <IpText ip={query.data.baseline.ip} />
            ) : query.isFetching ? (
              <Pending>加载中...</Pending>
            ) : (
              "未知"
            )}
            <Badge variant="secondary">
              {query.data?.results.length ?? 0} 个地址
            </Badge>
          </div>
        </CardContent>
      </Card>
      <ErrorNotice error={query.error} />
      {Boolean(query.data?.results.length) && (
        <Card>
          <CardContent>
            <DataTable
              data={query.data?.results ?? []}
              columns={columns}
              getRowId={(row) => row.ip}
              animateChanges={false}
              animateEntries
            />
          </CardContent>
        </Card>
      )}
      <LookupFaq
        items={[
          {
            title: "WebRTC 泄露是怎么回事？",
            text: "WebRTC 通过 ICE/STUN 发现可用于点对点连接的地址。STUN 通常使用 UDP，如果代理仅接管 TCP，候选地址可能暴露另一条公网出口。本页只创建数据通道，不申请摄像头或麦克风权限。",
          },
          {
            title: "STUN 和 UDP 是什么？",
            text: "UDP 是无连接传输协议。STUN 服务器把它观察到的公网映射地址返回给客户端。本工具同时配置 Google 与 Cloudflare STUN，采集 ICE 候选并与 HTTP 出口对照；mDNS 隐藏的本地地址不会被误报为公网 IP。",
          },
          {
            title: "如何判断是否泄露了？",
            text: "出口不同仅说明 UDP 和 HTTP 路由不同，也可能是预期分流。请核对运营商、地区和代理规则。没有采集到公网地址可能是 UDP 被阻断或浏览器限制，不能据此断言安全。",
          },
          {
            title: "发现泄露了，怎么修？",
            text: "检查客户端 UDP 转发、TUN 接管和 IPv6 规则。Firefox 可在 about:config 中关闭 media.peerconnection.enabled；Brave 可禁用非代理 UDP。关闭 WebRTC 会影响视频会议等功能，优先修正代理路由。",
          },
          {
            title: "为什么代理模式和 TUN 模式检测结果不同？",
            text: "系统代理与虚拟网卡模式接管流量的范围不同。STUN 在某些代理模式下可能完全无法发出，在 TUN 模式下则能真实反映 UDP 路由。请同时检测 DNS，不能将单次 WebRTC 结果视为完整隐私审计。",
          },
        ]}
      />
    </>
  );
}
