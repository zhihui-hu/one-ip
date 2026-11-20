import { t } from "@/i18n";
import { threatLabels, type IpbotProfile } from "./ipbot.ts";

export function ipProfile(data: IpbotProfile) {
  const score =
    typeof data.trust_score === "number" &&
    Number.isFinite(data.trust_score) &&
    data.trust_score >= 0 &&
    data.trust_score <= 100
      ? data.trust_score
      : null;
  const companyTypes: Record<string, string> = {
    isp: t("ip.profile.networkOperator"),
    hosting: t("ip.profile.hostingProvider"),
    business: t("ip.profile.business"),
    education: t("ip.profile.education"),
    government: t("ip.profile.government"),
    banking: t("ip.profile.finance"),
  };
  const companyType = data.company_type?.trim().toLowerCase();
  const company = companyType
    ? (companyTypes[companyType] ?? data.company_type!)
    : t("common.unknown");
  const conflict = data.isResidential === true && data.is_datacenter === true;
  const type = data.is_public_service
    ? t("common.publicService")
    : conflict
      ? t("ip.profile.conflictingTypes")
      : data.is_mobile
        ? t("common.mobileNetwork")
        : data.isResidential
          ? t("common.residentialIp")
          : data.is_datacenter
            ? t("common.datacenter")
            : t("common.unknown");
  const country = data.countryCode?.trim().toUpperCase();
  const registered = data.registered_country_code?.trim().toUpperCase();
  const sameCountry =
    country && registered && !data.is_public_service
      ? country === registered
      : null;
  const flags: [string, boolean | undefined][] = [
    ["VPN", data.is_vpn],
    [t("common.proxy"), data.is_proxy],
    ["Tor", data.is_tor],
    [t("common.crawlerFlag"), data.is_crawler],
    [t("common.abuseFlag"), data.is_abuser],
    ["Bogon", data.is_bogon],
  ];
  const detected = flags
    .filter(([, value]) => value === true)
    .map(([label]) => label);
  const unknownFlags = flags.filter(
    ([, value]) => typeof value !== "boolean",
  ).length;
  const threats = threatLabels(data, true);
  const clear = !detected.length && !unknownFlags && !threats.length;
  const preferred =
    score !== null &&
    score >= 90 &&
    data.isResidential === true &&
    data.is_datacenter === false &&
    data.is_mobile === false &&
    !data.is_public_service &&
    companyType === "isp" &&
    sameCountry === true &&
    clear;
  const seriousFlags = [
    ...(data.is_abuser ? [t("common.abuseFlag")] : []),
    ...(data.is_bogon ? ["Bogon"] : []),
    ...threats,
  ];
  const risk = seriousFlags.length
    ? {
        severity: "danger" as const,
        title: t("ip.profile.riskSignalsDetected"),
        flags: [...new Set([...detected, ...threats])],
        description: t(
          "ip.profile.sourceReportsAbuseReservedAddressThreatRecordsVerify",
        ),
      }
    : score !== null && score < 45 && !data.is_public_service
      ? {
          severity: "danger" as const,
          title: t("ip.profile.lowReputationScore"),
          flags: detected,
          description: t(
            "ip.profile.currentReputationScore100ReviewNetworkFlagsAssess",
            [score],
          ),
        }
      : detected.length
        ? {
            severity: "notice" as const,
            title: t("ip.profile.networkFlagsDetectedLabel"),
            flags: detected,
            description: t(
              "ip.profile.proxyVpnTorCrawlerFlagsMayAffectVerification",
            ),
          }
        : null;
  // Levels describe the available network profile, not hardware or line speed.
  const level: "S" | "A" | "B" | "C" | null =
    data.is_public_service ||
    conflict ||
    !clear ||
    score === null ||
    type === t("common.unknown") ||
    !companyType
      ? null
      : preferred
        ? "S"
        : score >= 90
          ? "A"
          : score >= 75
            ? "B"
            : "C";
  let grade = t("ip.profile.insufficientData");
  let explanation = t("ip.profile.someTypeRiskDataMissingSoProfileTier");
  let tone: "good" | "warn" | "bad" | "neutral" = "neutral";
  if (data.is_public_service) {
    grade = t("ip.profile.publicServiceNetwork");
    explanation = t("ip.profile.publicDnsCdnServicesMayUseAnycastRated");
  } else if (conflict) {
    grade = t("ip.profile.typeNeedsConfirmation");
    explanation = t(
      "ip.profile.sourceReportsBothResidentialDatacenterFlagsSoPreferred",
    );
    tone = "warn";
  } else if (detected.length || threats.length) {
    grade = t("ip.profile.networkFlagsDetected");
    explanation = t(
      "ip.profile.reportedFlagsProxyVpnFlagsDoThemselvesIndicate",
      [[...detected, ...threats].join("、")],
    );
    tone = data.is_abuser || data.is_bogon || threats.length ? "bad" : "warn";
  } else if (preferred) {
    grade = t("ip.profile.preferredResidential");
    explanation = t(
      "ip.profile.residentialIpIspCompanyMatchingRegistrationCountryReputation",
    );
    tone = "good";
  } else if (score !== null && type !== t("common.unknown") && clear) {
    grade =
      score >= 90
        ? data.is_mobile
          ? t("ip.profile.highReputationNetwork")
          : data.is_datacenter
            ? t("ip.profile.highReputationHosting")
            : data.isResidential
              ? t("ip.profile.highReputationResidential")
              : t("ip.profile.highReputationNetwork")
        : score >= 75
          ? t("ip.profile.goodReputation")
          : score >= 45
            ? t("ip.profile.moderateReputation")
            : t("ip.profile.lowReputation");
    explanation = t("ip.profile.tiersUseSourceReputationScore90100High");
    tone = score >= 75 ? "good" : score >= 45 ? "warn" : "bad";
  }
  const checks: {
    label: string;
    value: string;
    requirement: string;
    passed: boolean | null;
  }[] = [
    {
      label: t("ip.profile.ipType"),
      value: type,
      requirement: t("ip.profile.residentialNotHostingOrMobile"),
      passed:
        data.is_public_service ||
        conflict ||
        data.is_mobile ||
        data.isResidential === false ||
        data.is_datacenter === true
          ? false
          : data.isResidential === true &&
              data.is_datacenter === false &&
              data.is_mobile === false
            ? true
            : null,
    },
    {
      label: t("ip.profile.companyType"),
      value: company,
      requirement: t("ip.profile.ispCompanyType"),
      passed: companyType ? companyType === "isp" : null,
    },
    {
      label: t("ip.profile.registration"),
      value:
        sameCountry === null
          ? t("common.pendingConfirmation")
          : sameCountry
            ? t("ip.profile.countryMatches")
            : t("ip.profile.differentRegisteredCountry"),
      requirement: t("ip.profile.registeredAndLocatedCountriesMatch"),
      passed: sameCountry,
    },
    {
      label: t("ip.profile.networkFlags"),
      value:
        detected.length || threats.length
          ? t("ip.profile.flagsDetected")
          : unknownFlags
            ? t("ip.profile.fieldsMissing", [unknownFlags])
            : t("ip.profile.all6Negative"),
      requirement: t("ip.profile.sixNegativeFlagsAndNoKnownThreats"),
      passed:
        detected.length || threats.length ? false : unknownFlags ? null : true,
    },
    {
      label: t("common.ipReputation"),
      value: score === null ? t("common.unknown") : `${score} / 100`,
      requirement: t("ip.profile.reputation90"),
      passed: score === null ? null : score >= 90,
    },
  ];
  const scoreBand =
    score === null
      ? null
      : score >= 90
        ? 3
        : score >= 75
          ? 2
          : score >= 45
            ? 1
            : 0;
  return {
    score,
    scoreBand,
    grade,
    explanation,
    tone,
    checks,
    preferred,
    level,
    risk,
  };
}
