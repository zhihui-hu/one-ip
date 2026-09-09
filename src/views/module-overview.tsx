import { Link } from "react-router-dom";
import { ConnectivityTile, homeTargets } from "@/components/connectivity";
import { PageHeading, ToolCard } from "@/components/toolkit";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/i18n";
import { toolGroups } from "@/layout/routes";
import { AiNetworkCheck } from "@/views/ai/network-check";
import { aiPlatforms } from "@/views/ai/platforms";
import { BrowserSummary } from "@/views/browser/summary";
import { ArrowUpRight } from "lucide-react";

const descriptions: Record<string, string> = {
  "/network/ip": t("查询归属地、运营商、ASN 和地图位置"),
  "/network/whois": t("查看域名、IP 和 AS 注册资料"),
  "/network/connectivity": t("比较网站响应，核对不同站点的分流出口"),
  "/network/ping": t("从全球探针测量延迟与丢包"),
  "/network/dns": t("查看域名解析经过的出口网络"),
  "/network/cdn": t("查看内容分发网络的接入节点"),
  "/browser/environment": t("浏览器、系统、语言、屏幕和硬件信息"),
  "/browser/fingerprint": t("查看指纹组成，比较重复检测的变化"),
  "/browser/consistency": t("核对环境差异，运行浏览器深度检测"),
  "/browser/automation": t("查看可观察到的自动化相关信号"),
  "/browser/privacy": t("检查 WebRTC 出口与网站访问权限"),
  "/browser/challenges": t("体验第三方验证码并查看本次结果"),
};
const titles = {
  network: t("网络检测概述"),
  browser: t("浏览器检测概述"),
  ai: t("AI 检测概述"),
};
export default function ModuleOverview({
  group,
}: {
  group: keyof typeof toolGroups;
}) {
  return (
    <div className="space-y-3">
      <PageHeading title={titles[group]} description="" />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {toolGroups[group].map((tool) => (
          <Card key={tool.path}>
            <CardContent>
              <Link to={tool.path} className="group block">
                <span className="flex items-center justify-between gap-2 text-sm font-medium">
                  <span>{tool.label}</span>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                </span>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {descriptions[tool.path] ??
                    t("查看 {0} 网络响应、出口对照与相关入口", [tool.label])}
                </p>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
      {group === "network" && (
        <ToolCard title={t("当前网络响应")}>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {homeTargets.map((target) => (
              <ConnectivityTile key={target.name} target={target} />
            ))}
          </div>
        </ToolCard>
      )}
      {group === "browser" && <BrowserSummary />}
      {group === "ai" && (
        <AiNetworkCheck
          domains={aiPlatforms.map((platform) => platform.domain)}
        />
      )}
    </div>
  );
}
