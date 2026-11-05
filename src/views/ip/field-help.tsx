import { useState, type ReactNode } from "react";
import { Facts } from "@/components/toolkit";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

const definitions = new Map([
  ["ASN", t("ip.asnIdentifiesNetworkAnnouncingIpRoutesEndUsers")],
  ["CIDR", t("ip.cidrDescribesAddressBlockSmallerPrefixLengthMeans")],
  ["PTR", t("ip.reverseDnsMapsIpHostnameOperatorsConfigureThese")],
  ["RPKI", t("ip.rpkiValidatesPrefixAnnouncingAsnAgainstRouteAuthorizations")],
  [
    "Bogon",
    t("ip.privateReservedUnallocatedAddressesShouldAppearPublicRouting"),
  ],
  ["VPN", t("ip.whetherIpIdentifiedVpnExitVpnFlagDoes")],
  ["Tor", t("ip.whetherIpIdentifiedTorExitDescribesExitNetwork")],
  [
    t("ip.ipOrigin"),
    t("ip.comparesRegisteredGeolocatedCountriesMatchingCountriesLabeledNative"),
  ],
  [
    t("ip.asnSelfReportedType"),
    t("ip.networkOrganizationSReportedBusinessTypeSuchMixed"),
  ],
  [
    t("ip.asnIpv4Addresses"),
    t("ip.ipv4AddressCountAssociatedAsnSizeBlockNumber"),
  ],
  [
    t("ip.estimatedBandwidth"),
    t("ip.organizationLevelBandwidthEstimateReportedRangeMeasuredDownload"),
  ],
  [
    t("ip.asnRegistered"),
    t("ip.asnRegistrationAllocationDateActivationDateIpBlock"),
  ],
  [
    t("common.proxy"),
    t("ip.whetherAddressIdentifiedProxyExitDatabaseCoverageUpdate"),
  ],
  [
    t("ip.httpHoneypotBlacklist"),
    t("ip.threatSignalsHoneypotsObservingScansAttacksAutomatedTraffic"),
  ],
  [t("ip.abuseScore"), t("ip.strengthReportedAbuseSignalsFieldUsesOwnScale")],
  [
    t("ip.assessmentConfidence"),
    t("ip.providerSConfidenceAssessmentServiceUptimeProbabilityAccessing"),
  ],
  [
    t("ip.relatedNetworkAddresses"),
    t("ip.otherAssociatedNetworkAddressesNecessarilySameServerUsed"),
  ],
  [
    t("common.ipReputation"),
    t("ip.composite0100ReputationIndicatorHigherMeansLower"),
  ],
]);

function FieldHelp({ label }: { label: string }) {
  const mobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const description = definitions.get(label);
  if (!description) return <>{label}</>;
  const trigger = (
    <button
      type="button"
      className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[4px] p-0.5 leading-none text-muted-foreground hover:bg-muted hover:text-primary hover:outline-2 hover:outline-transparent focus-visible:bg-muted focus-visible:text-primary focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:min-h-7 pointer-coarse:min-w-7"
      aria-label={t("common.explain", [label])}
      onClick={mobile ? () => setOpen(true) : undefined}
    >
      <Info aria-hidden="true" size={14} className="block shrink-0" />
    </button>
  );
  return (
    <span className="inline-flex items-center gap-[5px] align-middle leading-[20px]">
      {label}
      {mobile ? (
        <>
          {trigger}
          <ResponsiveDialog
            open={open}
            onOpenChange={setOpen}
            title={label}
            description=""
          >
            <p className="text-sm leading-relaxed">{description}</p>
          </ResponsiveDialog>
        </>
      ) : (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent
              sideOffset={6}
              className="max-w-72 text-xs leading-relaxed"
            >
              {description}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </span>
  );
}
export function IpFacts({ rows }: { rows: [string, ReactNode][] }) {
  const compactLabels = new Set([
    "ASN",
    "VPN",
    "Tor",
    "Bogon",
    "RPKI",
    t("ip.ipOrigin"),
    t("ip.classification"),
    t("ip.registeredCountry"),
    t("common.datacenter"),
    t("common.mobileNetwork"),
    t("ip.companyType"),
    t("ip.addressType"),
    t("ip.addressCount"),
    t("common.proxy"),
    t("common.crawlerFlag"),
    t("common.abuseFlag"),
    t("ip.redditRestriction"),
    t("ip.abuseLevel"),
    t("ip.assessmentConfidence"),
  ]);
  const compact = new Set<string>();
  const fits = ([label, value]: [string, ReactNode]) =>
    compactLabels.has(label) &&
    (typeof value !== "string" || value.length <= 12);
  for (let i = 0; i < rows.length - 1; i++) {
    if (fits(rows[i]) && fits(rows[i + 1])) {
      compact.add(rows[i][0]);
      compact.add(rows[i + 1][0]);
      i++;
    }
  }
  const important = new Set([
    "ASN",
    "CIDR",
    t("ip.isp"),
    t("ip.classification"),
    t("ip.ipOrigin"),
    t("ip.threatFlags"),
  ]);
  const isCompact = (label: string) => compact.has(label);
  return (
    <Facts
      // Mobile: a two-column grid where short neighbouring facts share a line.
      className="max-md:grid max-md:grid-cols-2 max-md:gap-x-3.5"
      rowClassName={(label) =>
        cn(
          "min-h-[30px] min-w-0 gap-2.5 border-0 border-current border-b border-b-[color-mix(in_srgb,var(--border)_75%,transparent)] py-1 text-[12px] leading-[20px] max-md:col-span-full max-md:leading-[1.5]",
          isCompact(label) &&
            "max-md:col-span-1 max-md:flex-wrap max-md:gap-x-1 max-md:gap-y-px",
        )
      }
      labelClassName={(label) =>
        cn(
          "max-md:max-w-[42%] max-md:wrap-anywhere",
          isCompact(label) &&
            "max-md:max-w-full max-md:text-left max-md:text-[11px]",
        )
      }
      valueClassName={(label) =>
        cn(
          "overflow-x-auto font-normal wrap-break-word [scrollbar-width:thin] *:max-w-full max-md:flex-1 max-md:overflow-x-visible max-md:text-[12px] max-md:leading-[1.6] max-md:wrap-anywhere max-md:whitespace-normal",
          isCompact(label) &&
            "max-md:max-w-full max-md:flex-[0_1_auto] max-md:text-right max-md:[&_[data-ip-chip]]:px-[5px] max-md:[&_[data-ip-chip]]:py-0.5 max-md:[&_[data-ip-chip]]:text-[12px]",
        )
      }
      rows={rows.map(([label, value]) => [
        label,
        important.has(label) ? (
          <span key={label} className="font-semibold text-foreground">
            {value}
          </span>
        ) : (
          value
        ),
      ])}
      renderLabel={(label) => (
        <span>
          <FieldHelp label={label} />
        </span>
      )}
    />
  );
}
