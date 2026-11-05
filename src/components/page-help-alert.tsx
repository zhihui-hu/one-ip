import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { X } from "lucide-react";

const descriptions: Record<string, string> = {
  "/browser/environment": t(
    "pageHelp.viewSystemLanguageScreenHardwareInformationBrowserExposes",
  ),
  "/browser/fingerprint": t(
    "pageHelp.inspectBrowserFingerprintComponentsRepeatCheckCompareChanges",
  ),
  "/browser/consistency": t(
    "pageHelp.compareBrowserDeclarationsInformationOtherContextsDifferencesDo",
  ),
  "/browser/automation": t(
    "pageHelp.checkObservableAutomationSignalsSignalsFoundDoesRule",
  ),
  "/browser/challenges": t(
    "pageHelp.tryThirdPartyVerificationBrowserViewActualResult",
  ),

  "/lookup/whois": t("pageHelp.lookUpRegistrationDetailsDomainIpAsnIncluding"),
  "/network/ping": t("pageHelp.testLatencyPacketLossRegionsAroundWorldCompare"),
  "/network/cdn": t("pageHelp.seeWhichCdnNodesNetworkReachesWhereContent"),
  "/network/dns": t(
    "pageHelp.inspectDnsEgressAddressesLocationsUnderstandWhereDomain",
  ),
  "/browser/privacy": t(
    "pageHelp.reviewWebsitePermissionsBrowserCapabilitiesWebrtcEgressUnderstand",
  ),
  "/ai/gpt": t(
    "pageHelp.checkNetworkEgressConnectivityGptServicesTroubleshootAccess",
  ),
  "/ai/claude": t(
    "pageHelp.checkNetworkEgressConnectivityClaudeServicesTroubleshootAccess",
  ),
  "/ai/status": t(
    "pageHelp.viewOfficialServiceHealthIncidentsSeeWhetherServices",
  ),
  "/ai/status/openai": t(
    "pageHelp.viewOfficialOpenaiServiceHealthIncidentsIdentifyAffected",
  ),
  "/ai/status/claude": t(
    "pageHelp.viewOfficialClaudeServiceHealthIncidentsIdentifyAffected",
  ),
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
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const page = /^\/lookup\/ip\/[^/]+$/.test(normalized)
    ? "/lookup/ip"
    : normalized;
  const text = descriptions[page];
  return text ? <DismissibleHelp key={page} page={page} text={text} /> : null;
}
