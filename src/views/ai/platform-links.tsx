import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import type { AiPlatform } from "./platforms";

export function AiPlatformLinks({ platform }: { platform: AiPlatform }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {[
        { name: t("ai.website"), url: `https://${platform.domain}` },
        { name: t("ai.apiEndpoint"), url: platform.apiUrl },
        { name: t("common.apiDocumentation"), url: platform.docsUrl },
      ].map((link) => (
        <Button variant="outline" size="sm" asChild key={link.name}>
          <a href={link.url} target="_blank" rel="noreferrer">
            {link.name} ↗
          </a>
        </Button>
      ))}
      <Button variant="outline" size="sm" asChild>
        <Link to={`/status?service=${platform.statusId}`}>
          {t("navigation.serviceStatus")}
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link to="/browser/privacy">{t("common.permissionsPrivacy")}</Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link to="/ip">{t("ai.lookUpPublicIp")}</Link>
      </Button>
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
          {t("ai.supportedRegions")}
        </a>
      </Button>
    </div>
  );
}
