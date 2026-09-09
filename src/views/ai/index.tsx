import {
  PrivacyToggle,
  PageHeading,
  ToolCard,
  IpText,
  Pending,
} from "@/components/toolkit";
import { trace } from "@/lib/network";
import { getDomesticIp } from "@/views/home/api";
import { useQuery } from "@tanstack/react-query";
import { AiNetworkCheck } from "./network-check";
import { AiPlatformLinks } from "./platform-links";
import type { AiPlatform } from "./platforms";

export default function PlatformDiagnostics({
  platform,
}: {
  platform: AiPlatform;
}) {
  const domestic = useQuery({
    queryKey: ["domestic-ip"],
    queryFn: ({ signal }) => getDomesticIp(signal),
    retry: false,
  });
  const cf = useQuery({
    queryKey: ["cf-exit"],
    queryFn: ({ signal }) => trace("1.1.1.1", signal),
    retry: false,
  });
  return (
    <div className="ai-diagnostics">
      <PageHeading title={`${platform.name} 网络检测`} description="" />
      <div className="ai-overview">
        <ToolCard
          title={
            <div className="flex items-center justify-between gap-3">
              <span>{platform.name} 出口</span>
              <PrivacyToggle />
            </div>
          }
        >
          <div className="ip-value text-muted-foreground">暂不可用</div>
          <p className="small muted">暂未接入此平台可读取的出口 IP 接口。</p>
          <p className="small muted mt-2">
            下方对照地址不代表访问 {platform.name} 的实际分流出口。
          </p>
          <div className="ai-exit-comparison">
            <span className="small muted">其他出口对照</span>
            {[
              { query: domestic, title: "国内 IPv4" },
              { query: cf, title: "Cloudflare" },
            ].map(({ query, title }) => (
              <div className="ai-exit-row" key={title}>
                <span className="muted">{title}</span>
                <span>
                  {query.isPending ? (
                    <Pending>检测中…</Pending>
                  ) : query.isError ? (
                    <span className="muted">暂不可用</span>
                  ) : (
                    <IpText ip={query.data?.ip} />
                  )}
                </span>
              </div>
            ))}
            {(domestic.isError || cf.isError) && (
              <p className="small muted">对照出口可能受连接或跨域限制。</p>
            )}
          </div>
        </ToolCard>
        <AiNetworkCheck domains={[platform.domain]}>
          <p className="small muted mt-3">
            浏览器 HTTP 探测，不代表账号可用或模型权限。
          </p>
          <AiPlatformLinks platform={platform} />
        </AiNetworkCheck>
      </div>
    </div>
  );
}
