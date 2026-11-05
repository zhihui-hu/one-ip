import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { X } from "lucide-react";

const descriptions: Record<string, string> = {
  "/leak/dns": t("pageHelp.dnsLeak"),
  "/leak/webrtc": t("pageHelp.webrtcLeak"),
  "/unlock/sites": t("pageHelp.unlockSites"),
  "/speedtest": t("pageHelp.speedtest"),
  "/browser/environment": t(
    "pageHelp.viewSystemLanguageScreenHardwareInformationBrowserExposes",
  ),
  "/browser/fingerprint": t(
    "pageHelp.inspectBrowserFingerprintComponentsRepeatCheckCompareChanges",
  ),
  "/browser/checks": t(
    "pageHelp.compareBrowserDeclarationsInformationOtherContextsDifferencesDo",
  ),
  "/browser/privacy": t(
    "pageHelp.reviewWebsitePermissionsBrowserCapabilitiesWebrtcEgressUnderstand",
  ),
  "/whois": t("pageHelp.lookUpRegistrationDetailsDomainIpAsnIncluding"),
  "/ping": t("pageHelp.testLatencyPacketLossRegionsAroundWorldCompare"),
  "/unlock/gpt": t(
    "pageHelp.checkNetworkEgressConnectivityGptServicesTroubleshootAccess",
  ),
  "/unlock/claude": t(
    "pageHelp.checkNetworkEgressConnectivityClaudeServicesTroubleshootAccess",
  ),
  "/status": t("pageHelp.viewOfficialServiceHealthIncidentsSeeWhetherServices"),
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
    <Alert
      className="mb-2 flex items-start gap-2 border-0 bg-transparent py-[3px] text-muted-foreground"
      role="note"
    >
      <AlertDescription className="min-w-0 flex-1 text-xs leading-[1.6] text-wrap text-inherit wrap-anywhere md:text-wrap">
        {text}
      </AlertDescription>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="-mt-1 shrink-0"
        aria-label={t("pageHelp.dismissPageHelp")}
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
  const page = pathname.replace(/\/+$/, "") || "/";
  const text = descriptions[page];
  return text ? <DismissibleHelp key={page} page={page} text={text} /> : null;
}
