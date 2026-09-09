import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import type { AiPlatform } from "./platforms";

export function AiPlatformLinks({ platform }: { platform: AiPlatform }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {[
        { name: t("官网"), url: `https://${platform.domain}` },
        {
          name: platform.id === "qwen" ? t("API 地址（美国）") : t("API 地址"),
          url: platform.apiUrl,
        },
        { name: t("API 文档"), url: platform.docsUrl },
      ].map((link) => (
        <Button variant="outline" size="sm" asChild key={link.name}>
          <a href={link.url} target="_blank" rel="noreferrer">
            {link.name} ↗
          </a>
        </Button>
      ))}
      <Button variant="outline" size="sm" asChild>
        <Link to={`/status?service=${platform.statusId}`}>{t("服务状态")}</Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link to="/browser/privacy">{t("权限与隐私")}</Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link to="/network/ip">{t("查询公网 IP")}</Link>
      </Button>
      {["gpt", "claude"].includes(platform.id) && (
        <Button variant="outline" size="sm" asChild>
          <a
            href={
              platform.id === "claude"
                ? "https://www.anthropic.com/supported-countries"
                : "https://platform.openai.com/docs/supported-countries"
            }
            target="_blank"
            rel="noreferrer"
          >
            {t("支持地区 ↗")}
          </a>
        </Button>
      )}
    </div>
  );
}
