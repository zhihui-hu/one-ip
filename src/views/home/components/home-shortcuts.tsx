import { Link } from "react-router-dom";
import { SiteLogo } from "@/components/site-logo";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/i18n";
import {
  Activity,
  Fingerprint,
  Network,
  Search,
  ShieldCheck,
} from "lucide-react";
import { ToolDirectory } from "./tool-directory";

const tileClass =
  "flex min-w-0 flex-col items-center gap-2 rounded-[12px] border border-transparent px-1.5 pt-3 pb-2.5 text-center text-[12px] leading-[1.35] text-foreground no-underline transition-[background-color,border-color] duration-150 ease-[ease] hover:border-[color-mix(in_srgb,var(--primary)_24%,transparent)] hover:bg-[color-mix(in_srgb,var(--primary)_14%,var(--card))] hover:text-primary hover:no-underline focus-visible:border-[color-mix(in_srgb,var(--primary)_24%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--primary)_14%,var(--card))] focus-visible:text-primary focus-visible:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:border-[color-mix(in_srgb,var(--primary)_24%,transparent)] active:bg-[color-mix(in_srgb,var(--primary)_14%,var(--card))] active:text-primary active:no-underline";

/** Icon tint by tile position (1-based), mirroring the former nth-child rules. */
function iconTone(position: number) {
  if (position <= 2) return "bg-muted/70 text-primary";
  if (position % 3 === 0)
    return "bg-[color-mix(in_srgb,#69b49a_12%,var(--card))] text-[#428873]";
  if (position % 3 === 1)
    return "bg-[color-mix(in_srgb,#8caedf_12%,var(--card))] text-[#6989b5]";
  return "bg-[color-mix(in_srgb,#b59dc9_12%,var(--card))] text-[#9781ad]";
}

export function HomeShortcuts() {
  const tools = [
    {
      path: "/ai/claude",
      label: t("common.claudeChinaUserCheck"),
      description: t("home.inspectLanguageTimezoneDeviceSignalsExposedBrowser"),
      icon: () => <SiteLogo website="https://claude.ai" className="size-6" />,
    },
    {
      path: "/ai/gpt",
      label: t("home.chatgptDiagnostics"),
      description: t("home.checkAiServiceResponsesAndNetworkExits"),
      icon: () => <SiteLogo website="https://chatgpt.com" className="size-6" />,
    },
    {
      path: "/network/connectivity",
      label: t("common.connectivityEgress"),
      description: t(
        "home.checkWebsiteConnectivityResponseLatencyAndActualEgress",
      ),
      icon: Network,
    },
    {
      path: "/browser/challenges",
      label: t("home.humanVerification"),
      description: t("home.tryVerificationChallengesAndReviewResults"),
      icon: ShieldCheck,
    },
    {
      path: "/browser/consistency",
      label: t("common.consistency"),
      description: t("home.checkBrowserEnvironmentAndDeviceSignals"),
      icon: Search,
    },
    {
      path: "/browser/fingerprint",
      label: t("common.browserFingerprint"),
      description: t("home.exploreFingerprintComponentsAndChanges"),
      icon: Fingerprint,
    },
    {
      path: "/ai/status",
      label: t("navigation.serviceStatus"),
      description: t("home.viewPlatformIncidentsAndServiceUpdates"),
      icon: Activity,
    },
  ];
  return (
    // `data-plain-links`: the home page's hover-underline rule skips these tiles.
    <Card data-plain-links="">
      <CardContent>
        <nav
          aria-label={t("home.popularTools")}
          className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-1 max-xs:grid-cols-[repeat(4,minmax(0,1fr))]"
        >
          {tools.map((tool, index) => (
            <Link
              key={tool.path}
              to={tool.path}
              title={tool.description}
              className={tileClass}
            >
              <span
                className={`grid size-10 flex-none place-items-center rounded-[12px] [&_svg]:size-5 [&_svg]:stroke-[1.75] ${iconTone(index + 1)}`}
              >
                <tool.icon aria-hidden="true" />
              </span>
              <span className="line-clamp-2">{tool.label}</span>
            </Link>
          ))}
        </nav>
        <ToolDirectory />
      </CardContent>
    </Card>
  );
}
