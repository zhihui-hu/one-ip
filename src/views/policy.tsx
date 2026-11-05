import { AuthorContact } from "@/components/author-contact";
import { PageHeading, ToolCard } from "@/components/toolkit";
import { t } from "@/i18n";

export default function PolicyPage({ page }: { page: "terms" | "privacy" }) {
  const sections = {
    terms: [
      [
        t("policy.tsx.serviceScope"),
        t("policy.tsx.siteProvidesIpLookupsNetworkDiagnosticsBrowserChecks"),
      ],
      [
        t("policy.tsx.acceptableUse"),
        t("policy.tsx.useTheseToolsTargetsAuthorizedTestDoUse"),
      ],
      [
        t("policy.tsx.apiAndRequestLimits"),
        t("policy.tsx.apiRequiresKeyButRateLimitedRequestIp"),
      ],
      [
        t("policy.tsx.interpretingResults"),
        t("policy.tsx.httpResponsesLatencyDifferIcmpPingDoEstablish"),
      ],
      [
        t("policy.tsx.resultsAndAvailability"),
        t("policy.tsx.resultsDependNetworkBrowserRestrictionsThirdPartyData"),
      ],
      [
        t("policy.tsx.thirdPartyServicesAndOpenSourceLicense"),
        t("policy.tsx.whenVisitingThirdPartyLinksUsingTheirServices"),
      ],
      [
        t("policy.tsx.serviceChanges"),
        t("policy.tsx.featuresDataSourcesRateLimitsMayChangeCheck"),
      ],
    ],
    privacy: [
      [
        t("policy.tsx.queriesAndNetworkRequests"),
        t("policy.tsx.hostingServiceProcessesRequestIpNecessaryNetworkRequest"),
      ],
      [
        t("navigation.browserChecks"),
        t(
          "policy.tsx.browserDiagnosticsReadDisplayEnvironmentFingerprintPermissionInformation",
        ),
      ],
      [
        t("common.localStorage"),
        t("policy.tsx.siteStoresThemeLanguageNoticePreferencesLookupHistory"),
      ],
      [
        t("policy.tsx.thirdPartyDataProcessing"),
        t("policy.tsx.ipHealthQueriesSendQueriedPublicIpNet"),
      ],
      [
        t("policy.tsx.thirdPartyServicesUsed"),
        t("policy.tsx.ipLookupsMayContactIpwhoIpSbIpify"),
      ],
      [
        t("policy.tsx.webrtcAndDevicePermissions"),
        t("policy.tsx.webrtcChecksConnectGoogleCloudflareStunServicesMay"),
      ],
      [
        t("policy.tsx.optionalCaptcha"),
        t(
          "policy.tsx.whenConfiguredUsedCaptchaFeaturesLoadCloudflareTurnstile",
        ),
      ],
      [
        t("policy.tsx.retentionAndDeletion"),
        t("policy.tsx.lookupHistoryKeepsLatest10SuccessfulQueriesResults"),
      ],
    ],
  };
  return (
    <div className="space-y-3">
      <PageHeading
        title={page === "terms" ? t("policy.terms") : t("policy.privacy")}
      />
      {sections[page].map(([title, body]) => (
        <ToolCard key={title} title={title}>
          <p className="text-sm leading-6 text-muted-foreground">{body}</p>
        </ToolCard>
      ))}
      <ToolCard title={t("policy.contactAuthor")}>
        <p className="mb-2 text-sm text-muted-foreground">
          {t("policy.tsx.questionsAboutSiteUsagePrivacyContactAuthorEmail")}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <a
            className="text-sm text-primary hover:underline"
            href="mailto:ip@huzhihui.com"
          >
            ip@huzhihui.com
          </a>
          <AuthorContact className="text-sm text-primary hover:underline">
            {t("sites.wechat")}
          </AuthorContact>
        </div>
      </ToolCard>
    </div>
  );
}
