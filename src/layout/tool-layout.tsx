import { NavLink, Outlet } from "react-router-dom";
import { PageHelpAlert } from "@/components/page-help-alert";
import { SiteLogo } from "@/components/site-logo";
import { aiPlatforms } from "@/views/ai/platforms";
import { toolGroups } from "./routes";

export function ToolLayout({ group }: { group: keyof typeof toolGroups }) {
  return (
    <>
      <nav className="tool-subnav" aria-label="工具导航">
        <NavLink to={`/${group}`} end>
          概述
        </NavLink>
        {toolGroups[group].map((tool) => (
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
