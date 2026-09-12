import { CountryFlag } from "@/components/country-flag";
import {
  PrivacyToggle,
  PageHeading,
  ToolCard,
  IpText,
  Pending,
} from "@/components/toolkit";
import { t } from "@/i18n";
import { trace } from "@/lib/network";
import { queryKeys } from "@/lib/query-keys";
import { getGeo, getDomesticIp } from "@/views/home/api";
import { useQuery } from "@tanstack/react-query";
import { AiNetworkCheck } from "./network-check";
import { AiPlatformLinks } from "./platform-links";
import type { AiPlatform } from "./platforms";

export default function PlatformDiagnostics({
  platform,
}: {
  platform: AiPlatform;
}) {
  const exit = useQuery({
    queryKey: queryKeys.ai.exit(platform.id),
    enabled: Boolean(platform.traceDomain),
    queryFn: ({ signal }) => trace(platform.traceDomain!, signal),
    staleTime: 60_000,
    retry: false,
  });
  const geo = useQuery({
    queryKey: queryKeys.geo.byIp(exit.data?.ip),
    enabled: Boolean(exit.data?.ip),
    queryFn: ({ signal }) => getGeo(exit.data!.ip, signal),
    staleTime: 60_000,
    retry: false,
  });
  const domestic = useQuery({
    queryKey: queryKeys.egress.domestic(),
    queryFn: ({ signal }) => getDomesticIp(signal),
    retry: false,
  });
  const cf = useQuery({
    queryKey: queryKeys.egress.cloudflare(),
    queryFn: ({ signal }) => trace("1.1.1.1", signal),
    retry: false,
  });
  return (
    <div className="ai-diagnostics">
      <PageHeading title={t("{0} 网络检测", [platform.name])} description="" />
      <div className="ai-overview">
        <ToolCard
          title={
            <div className="flex items-center justify-between gap-3">
              <span>
                {platform.name}
                {t("出口")}
              </span>
              <PrivacyToggle />
            </div>
          }
        >
          {platform.traceDomain ? (
            <>
              <div className="ip-value text-primary">
                {exit.isPending ? (
                  <Pending>{t("正在检测出口…")}</Pending>
                ) : (
                  <IpText ip={exit.data?.ip} />
                )}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                {exit.isError ? (
                  t("出口查询失败，可能受网络或跨域限制。")
                ) : geo.isFetching ? (
                  <Pending>{t("查询归属信息…")}</Pending>
                ) : (
                  <>
                    <CountryFlag
                      code={geo.data?.country_code ?? exit.data?.country_code}
                    />{" "}
                    {[
                      geo.data?.country ?? exit.data?.country_code,
                      geo.data?.city,
                      geo.data?.isp,
                    ]
                      .filter(Boolean)
                      .join(" · ") || t("归属信息暂不可用")}
                  </>
                )}
              </p>
            </>
          ) : (
            <p className="text-xs leading-5 text-muted-foreground">
              {t("暂未找到可读取此平台出口的公开接口；以下地址仅供对照。")}
            </p>
          )}
          <div className="ai-exit-comparison">
            <span className="small muted">{t("其他出口对照")}</span>
            {[
              { query: domestic, title: t("国内 IPv4") },
              { query: cf, title: "Cloudflare" },
            ].map(({ query, title }) => (
              <div className="ai-exit-row" key={title}>
                <span className="muted">{title}</span>
                <span>
                  {query.isPending ? (
                    <Pending>{t("检测中…")}</Pending>
                  ) : query.isError ? (
                    <span className="muted">{t("暂不可用")}</span>
                  ) : (
                    <IpText ip={query.data?.ip} />
                  )}
                </span>
              </div>
            ))}
            {(domestic.isError || cf.isError) && (
              <p className="small muted">
                {t("对照出口可能受连接或跨域限制。")}
              </p>
            )}
          </div>
        </ToolCard>
        <AiNetworkCheck domains={[platform.domain]}>
          <p className="small muted mt-3">
            {t("浏览器 HTTP 探测，不代表账号可用或模型权限。")}
          </p>
          <AiPlatformLinks platform={platform} />
        </AiNetworkCheck>
      </div>
    </div>
  );
}
