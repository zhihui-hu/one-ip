import { Link } from "react-router-dom";
import { UnderlineHover } from "@/components/underline-hover";
import { useAvailableTools } from "@/hooks/use-available-tools";
import { t } from "@/i18n";
import { toolGroups } from "@/layout/routes";
import {
  ChevronDown,
  Search,
  Fingerprint,
  Network,
  Sparkles,
} from "lucide-react";

const directoryLinkClass =
  "flex min-h-9 items-center rounded-[8px] bg-[color-mix(in_srgb,var(--muted)_60%,transparent)] px-2.5 py-1.5 text-[12px] leading-[1.5] text-foreground transition-[background-color,color] duration-150 ease-[ease] hover:bg-[color-mix(in_srgb,var(--primary)_14%,var(--card))] hover:text-primary hover:no-underline focus-visible:bg-[color-mix(in_srgb,var(--primary)_14%,var(--card))] focus-visible:text-primary focus-visible:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:bg-[color-mix(in_srgb,var(--primary)_14%,var(--card))] active:text-primary active:no-underline max-xs:min-h-10";

/** Full tool index, collapsed by default so the home page stays focused. */
export function ToolDirectory() {
  const browserTools = useAvailableTools("browser");
  const navigationGroups = [
    { label: t("navigation.lookup"), icon: Search, tools: toolGroups.lookup },
    {
      label: t("navigation.network"),
      icon: Network,
      tools: toolGroups.network,
    },
    {
      label: t("navigation.browser"),
      icon: Fingerprint,
      tools: browserTools,
    },
    { label: "AI", icon: Sparkles, tools: toolGroups.ai },
  ];
  const count = navigationGroups.reduce(
    (total, group) => total + group.tools.length,
    0,
  );
  return (
    // `data-plain-*`: the home page's hover-underline rule skips this summary and these links.
    <details
      data-plain-summary=""
      className="group/directory mt-2.5 border-t border-border"
    >
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-center gap-1.5 pt-2.5 text-[12px] text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        <span id="home-tool-directory-title">
          {t("home.allTools")} · {count}
        </span>
        <ChevronDown
          className="size-3.5 transition-[transform] duration-200 ease-[ease] group-open/directory:[transform:rotate(180deg)]"
          aria-hidden="true"
        />
      </summary>
      <nav aria-labelledby="home-tool-directory-title" className="pt-2">
        {navigationGroups.map((group) => (
          <section
            className="grid grid-cols-[120px_minmax(0,1fr)] items-start gap-x-4 gap-y-2 border-border py-2.5 first:pt-0 not-first:border-t max-xs:grid-cols-[minmax(0,1fr)] max-xs:gap-1"
            key={group.label}
          >
            <h3 className="flex min-h-9 items-center gap-1.5 text-[12px] font-medium text-muted-foreground max-xs:min-h-6">
              <group.icon
                className="size-[15px] flex-none"
                aria-hidden="true"
              />
              {group.label}
            </h3>
            <ul
              data-plain-links=""
              className="flex min-w-0 flex-wrap gap-x-1.5 gap-y-1"
            >
              {group.tools.map((tool) => (
                <li key={tool.path}>
                  <Link className={directoryLinkClass} to={tool.path}>
                    {tool.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <UnderlineHover asChild>
          <Link
            className="mt-2.5 inline-block text-[0.78rem] text-muted-foreground"
            to="/docs/api"
          >
            {t("common.apiDocumentation")} ›
          </Link>
        </UnderlineHover>
      </nav>
    </details>
  );
}
