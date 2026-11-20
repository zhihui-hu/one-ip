import { t } from "@/i18n";
import { threatLabels, type IpbotProfile } from "./ipbot.ts";
import type { ipProfile } from "./profile";

type Option = {
  label: string;
  description: string;
  current?: boolean;
  status?: string;
};
type Field = {
  label: string;
  value: string;
  detail?: string;
  options: Option[];
  tone?: "success" | "warning" | "danger" | "info";
  special?: boolean;
};

export function ipProfileFields(
  data: IpbotProfile,
  profile: ReturnType<typeof ipProfile>,
): Field[] {
  const threats = threatLabels(data);
  const riskThreats = threatLabels(data, true);
  const typeOptions = [
    [
      t("common.residentialIp"),
      t(
        "ip.profile.addressesAssignedHomePersonalBroadbandResidentialDoesGuarantee",
      ),
    ],
    [
      t("common.mobileNetwork"),
      t("ip.profile.cellularNetworkAddressesMaySharedDevicesChangeConnection"),
    ],
    [
      t("common.datacenter"),
      t("ip.profile.hostingCloudCdnIpLeasingAddressesUsefulService"),
    ],
    [
      t("common.publicService"),
      t("ip.profile.publicDnsCdnServiceAddressesMayUseAnycast"),
    ],
    [
      t("ip.profile.conflictingTypes"),
      t("ip.profile.sourceReturnsBothResidentialHostingFlagsUsageNeeds"),
    ],
    [
      t("common.unknown"),
      t("ip.profile.insufficientTypeDataMissingValuesDoProveResidential"),
    ],
  ];
  const companies = [
    [
      "isp",
      t("ip.profile.networkOperator"),
      t(
        "ip.profile.internetAccessNetworkTransitProvidersTheirAddressesNecessarily",
      ),
    ],
    [
      "hosting",
      t("ip.profile.hostingProvider"),
      t("ip.profile.organizationsOfferingHostingCloudComputingOrCdnServices"),
    ],
    [
      "business",
      t("ip.profile.business"),
      t("ip.profile.businessNetworksAloneDoesEstablishResidentialHostingUsage"),
    ],
    [
      "education",
      t("ip.profile.education"),
      t(
        "ip.profile.networksUsedSchoolsUniversitiesResearchEducationalOrganizations",
      ),
    ],
    [
      "government",
      t("ip.profile.government"),
      t(
        "ip.profile.governmentPublicAdministrationNetworksSpecialAccessPermissionsImplied",
      ),
    ],
    [
      "banking",
      t("ip.profile.finance"),
      t(
        "ip.profile.bankingFinancialNetworksHigherReputationInvestmentSafetyImplied",
      ),
    ],
    [
      "other",
      t("ip.profile.otherType"),
      t(
        "ip.profile.unlistedBusinessTypePreservedSuppliedWithoutQualityRanking",
      ),
    ],
    [
      "unknown",
      t("common.unknown"),
      t("ip.profile.theSourceDidNotProvideACompanyType"),
    ],
  ];
  const rawCompany = data.company_type?.trim().toLowerCase();
  const companyKey = !rawCompany
    ? "unknown"
    : companies.some(([key]) => key === rawCompany)
      ? rawCompany
      : "other";
  const country = data.countryCode?.trim().toUpperCase();
  const registered = data.registered_country_code?.trim().toUpperCase();
  const registration = data.is_public_service
    ? "na"
    : !country || !registered
      ? "unknown"
      : country === registered
        ? "same"
        : "different";
  const registrationOptions = [
    [
      "same",
      t("ip.profile.countryMatches"),
      t("ip.profile.locatedRegisteredCountriesMatchAloneDoesProveNative"),
    ],
    [
      "different",
      t("ip.profile.differentRegisteredCountry"),
      t(
        "ip.profile.differencesMayReflectCrossBorderOperationsReassignmentDatabase",
      ),
    ],
    [
      "unknown",
      t("common.pendingConfirmation"),
      t("ip.profile.registeredLocatedCountryMissingSoComparisonUnavailable"),
    ],
    [
      "na",
      t("ip.profile.notApplicable"),
      t("ip.profile.publicServicesMayOperateMultipleRegionsSingleCountry"),
    ],
  ];
  const flags: [string, string, boolean | undefined][] = [
    [
      "VPN",
      t("ip.profile.identifiedVpnExitUsageFlagDoesImplyMalicious"),
      data.is_vpn,
    ],
    [
      t("common.proxy"),
      t("ip.profile.identifiedProxyExitMayAffectWebsiteVerification"),
      data.is_proxy,
    ],
    [
      "Tor",
      t("ip.profile.identifiedTorExitSomeServicesMayRestrictThese"),
      data.is_tor,
    ],
    [
      t("common.crawlerFlag"),
      t("ip.profile.identifiedAutomationCrawlerRelatedAssessContext"),
      data.is_crawler,
    ],
    [
      t("common.abuseFlag"),
      t(
        "ip.profile.sourceRecordsAbuseActivityBlocklistSignalsVerificationAdvised",
      ),
      data.is_abuser,
    ],
    [
      "Bogon",
      t(
        "ip.profile.privateReservedUnallocatedAddressesShouldAppearPublicInternet",
      ),
      data.is_bogon,
    ],
  ];
  const fields: Field[] = [
    {
      label: t("ip.profile.ipType"),
      value: profile.checks[0].value,
      detail: t(
        "ip.profile.theseCategoriesDescribeNetworkUsageIpv4Ipv6Describe",
      ),
      options: typeOptions.map(([label, description]) => ({
        label,
        description,
        current: label === profile.checks[0].value,
      })),
    },
    {
      label: t("ip.profile.companyType"),
      value: profile.checks[1].value,
      detail: t("ip.profile.currentCompany", [
        data.company_name || data.isp || t("common.unknown"),
      ]),
      options: companies.map(([key, label, description]) => ({
        label,
        description,
        current: key === companyKey,
      })),
    },
    {
      label: t("ip.profile.registration"),
      value: registrationOptions.find(([key]) => key === registration)![1],
      detail: t(
        "ip.profile.locatedCountryRegisteredCountryMatchingCountriesDoVerify",
        [
          data.country || country || t("common.unknown"),
          data.registered_country || registered || t("common.unknown"),
        ],
      ),
      options: registrationOptions.map(([key, label, description]) => ({
        label,
        description,
        current: key === registration,
      })),
    },
    {
      label: t("ip.profile.networkFlags"),
      value: profile.checks[3].value,
      detail: t("ip.profile.detectedMeansCurrentSourceReturnedSuchFlagUnknown"),
      options: [
        ...flags.map(([label, description, value]) => ({
          label,
          description,
          current: value === true,
          status:
            value === true
              ? t("common.detected")
              : value === false
                ? t("common.notDetected")
                : t("common.unknown"),
        })),
        {
          label: t("ip.profile.additionalIntelligence"),
          description: threats.length
            ? threats.join(" · ")
            : t(
                "ip.profile.additionalThreatIntelligenceShownSeparatelySixNetworkFlags",
              ),
          status: riskThreats.length
            ? t("common.detected")
            : threats.length
              ? t("ip.profile.informationalOnly")
              : data.intelligence?.threats
                ? t("common.notDetected")
                : t("common.unknown"),
          current: riskThreats.length > 0,
        },
      ],
    },
  ];
  fields[0].tone =
    data.isResidential && data.is_datacenter ? "warning" : "info";
  fields[1].tone = "info";
  fields[1].special = ["education", "government", "banking"].includes(
    companyKey,
  );
  fields[2].tone = registration === "same" ? "success" : "info";
  fields[3].tone =
    profile.risk?.severity === "danger"
      ? "danger"
      : profile.risk
        ? "warning"
        : profile.checks[3].passed
          ? "success"
          : "info";
  return fields;
}
