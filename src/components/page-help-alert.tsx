import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const descriptions: Record<string, string> = {
  "/browser/environment": "查看浏览器向网站提供的系统、语言、屏幕和硬件信息。",
  "/browser/fingerprint":
    "查看浏览器指纹及各项组成，重复检测可比较本次会话内的变化。",
  "/browser/consistency":
    "对照浏览器声明与不同上下文的环境信息，查看存在差异的项目。差异不代表使用了指纹浏览器。",
  "/browser/automation":
    "检查浏览器暴露的自动化相关特征；未发现特征不代表没有自动化。",
  "/browser/challenges":
    "体验当前浏览器完成第三方验证的过程，查看本站本次验证的实际结果。",

  "/network/ip": "查询公网 IP 的归属地、运营商和所属网络，了解地址的详细信息。",
  "/network/whois":
    "查询域名、IP 或 AS 号的注册信息，了解注册主体、所属机构及相关日期。",
  "/network/connectivity":
    "检测常用网站的连通性和访问延迟，了解当前网络访问国内外服务的表现。",
  "/network/ping":
    "从全球不同地区测试目标的网络延迟和丢包情况，比较各地的连接质量。",
  "/network/cdn": "查看当前网络访问各 CDN 的节点位置，了解内容服务的接入地区。",
  "/network/dns": "查看 DNS 解析的出口地址和归属地，了解域名查询经过的网络。",
  "/browser/privacy":
    "查看网站可访问的权限、浏览器能力与 WebRTC 出口，了解可能暴露的信息。",
  "/ai/gpt": "检查访问 GPT 相关服务的网络出口和连通性，辅助排查访问问题。",
  "/ai/claude":
    "检查访问 Claude 相关服务的网络出口和连通性，辅助排查访问问题。",
  "/status": "查看各服务的官方运行状态和故障事件，了解服务是否受到影响。",
  "/status/openai":
    "查看 OpenAI 各项服务的官方运行状态和故障事件，了解受影响的功能。",
  "/status/claude":
    "查看 Claude 各项服务的官方运行状态和故障事件，了解受影响的功能。",
};

function DismissibleHelp({ page, text }: { page: string; text: string }) {
  const key = `ip-tools:page-help:v1:${page}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(key) === "dismissed";
    } catch {
      return false;
    }
  });
  if (dismissed) return null;
  return (
    <Alert className="page-help-alert mb-3 border-0 py-2 pr-10" role="note">
      <AlertDescription className="text-xs leading-5">{text}</AlertDescription>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute right-1 top-1"
        aria-label="关闭功能说明"
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem(key, "dismissed");
          } catch {
            /* Keep closing usable when storage is unavailable. */
          }
        }}
      >
        <X className="size-3.5" />
      </Button>
    </Alert>
  );
}

export function PageHelpAlert() {
  const { pathname } = useLocation();
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const page = /^\/network\/ip\/[^/]+$/.test(normalized)
    ? "/network/ip"
    : normalized;
  const text = descriptions[page];
  return text ? <DismissibleHelp key={page} page={page} text={text} /> : null;
}
