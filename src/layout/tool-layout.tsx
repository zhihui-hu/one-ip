import { NavLink, Outlet } from "react-router-dom";
import { PageHelpAlert } from "@/components/page-help-alert";
import { SiteLogo } from "@/components/site-logo";
import { useAvailableTools } from "@/hooks/use-available-tools";
import { t } from "@/i18n";
import { aiPlatforms } from "@/views/ai/platforms";
import { toolGroups } from "./routes";

export function ToolLayout({ group }: { group: keyof typeof toolGroups }) {
  const tools = useAvailableTools(group);
  return (
    <>
      <nav className="tool-subnav" aria-label={t("工具导航")}>
        <NavLink to={`/${group}`} end>
          {t("概述")}
        </NavLink>
        {tools.map((tool) => (
          <NavLink key={tool.path} to={tool.path}>
            {group === "ai" && (
              <SiteLogo
                website={`https://${aiPlatforms.find((platform) => tool.path === `/ai/${platform.id}`)?.domain}`}
              />
            )}
            {tool.label}
          </NavLink>
        ))}
      </nav>
      <PageHelpAlert />
      <Outlet />
    </>
  );
}
