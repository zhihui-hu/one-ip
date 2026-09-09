import { Link } from "react-router-dom";
import { UnderlineHover } from "@/components/underline-hover";
import type { AiPlatform } from "./platforms";

export function AiPlatformLinks({ platform }: { platform: AiPlatform }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-xs text-primary">
      {[
        { name: "官网", url: `https://${platform.domain}` },
        {
          name: platform.id === "qwen" ? "API 地址（美国）" : "API 地址",
          url: platform.apiUrl,
        },
        { name: "API 文档", url: platform.docsUrl },
      ].map((link) => (
        <UnderlineHover asChild key={link.name}>
          <a href={link.url} target="_blank" rel="noreferrer">
            {link.name} ↗
          </a>
        </UnderlineHover>
      ))}
      <UnderlineHover asChild>
        <Link to={`/status?service=${platform.statusId}`}>服务状态</Link>
      </UnderlineHover>
      <UnderlineHover asChild>
        <Link to="/browser/privacy">权限与隐私</Link>
      </UnderlineHover>
      <UnderlineHover asChild>
        <Link to="/network/ip">查询公网 IP</Link>
      </UnderlineHover>
      {["gpt", "claude"].includes(platform.id) && (
        <UnderlineHover asChild>
          <a
            href={
              platform.id === "claude"
                ? "https://www.anthropic.com/supported-countries"
                : "https://platform.openai.com/docs/supported-countries"
            }
            target="_blank"
            rel="noreferrer"
          >
            支持地区 ↗
          </a>
        </UnderlineHover>
      )}
    </div>
  );
}
