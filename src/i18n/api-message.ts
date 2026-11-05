import { t } from "./index.ts";
import { messages, type MessageKey } from "./messages.ts";

// The API currently returns Chinese display text. Keep that wire format separate
// from translation keys; unknown third-party messages retain their original text.
const apiMessageKeys = [
  "api.publicServiceIncidentsReported",
  "api.noUnresolvedIncidentsReportedInTheFeed",
  "api.serviceIncidentsReported",
  "common.operational",
  "api.couldConnectOfficialDeepseekRssFeedRetryLater",
  "api.couldParseOfficialDeepseekStatusDataVisitOfficial",
  "api.unknownVerificationService",
  "api.theCurrentEnvironmentIsMissingASiteKey",
  "api.theCurrentEnvironmentIsMissingAServerSecret",
  "api.currentDomainEnvironmentSVerificationAllowlist",
  "api.selectAVerificationService",
  "api.verificationServiceConfiguredSite",
  "api.invalidVerificationTokenPleaseVerifyAgain",
  "api.verificationServiceUnavailablePleaseRetryLater",
  "api.invalidVerificationSecretCheckConfiguration",
  "api.verificationFailedTokenExpiredPleaseVerifyAgain",
  "api.verificationHostnameMismatchPleaseVerifyAgain",
  "api.verificationActionMismatchPleaseVerifyAgain",
  "api.invalidVerificationScorePleaseTryAgain",
  "api.thisScoreIsBelowThePassingThreshold",
  "api.thisVerificationAttemptOnThisSitePassed",
  "api.serviceIssuesOrAdvisoriesReported",
  "api.noWidespreadIncidentsReported",
  "api.theIpLocationSourceReturnedNoValidResult",
  "api.theSecondaryLocationSourceReturnedNoResult",
  "api.enterAValidPublicIpv4OrIpv6Address",
  "api.privateLoopbackAndReservedAddressesAreNotSupported",
  "api.enterAValidDomainOrIp",
  "api.enterPublicDomainWithoutProtocolPathPort",
  "api.emptyJsonContent",
  "api.jsonContentIsTooLarge",
  "api.contentIsNotValidJson",
  "api.upstreamConnectionFailedOrTimedOut",
  "api.upstreamRateLimitReachedPleaseRetryLater",
  "api.applicationJsonIsRequired",
  "api.aJsonObjectIsRequired",
  "api.onlySameOriginRequestsAreSupported",
  "api.requestMethodNotSupported",
  "api.tooManyRequestsPleaseRetryInOneMinute",
  "api.apiEndpointNotFound",
  "api.realVisitorIpAvailableLocallyDeployWorkerCheck",
  "api.unknownService",
  "api.publicStatusApiIntegratedServiceCheckOfficialStatus",
  "api.invalidUrlEncoding",
  "api.lookupTemporarilyFailedPleaseRetryLater",
  "ip.ipReturnedSourceDoesMatchRequestedAddress",
  "api.unsupportedMeasurementProtocol",
  "api.selectValidRegions150ProbesPerBatch",
  "api.select150RegionsPerBatch",
  "api.invalidProbeRegion",
  "api.invalidMeasurementId",
  "common.underMaintenance",
  "api.unexpectedCertificateLogDataFormat",
  "api.thirdPartyStatusDataIsUnavailable",
  "api.thirdPartyWebsiteMonitorOperational",
  "api.thirdPartyWebsiteMonitorOutage",
  "api.invalidAsNumber",
  "api.enterAValidDomainIpOrAsNumber",
  "api.enterDomainWithoutPathProtocol",
  "api.httpsRdapServiceAvailableDomainSuffix",
  "api.registrationSourceReturnedNoValidResult",
  "api.rdapRegistryData",
  "api.requestFailed",
  "api.upstreamUnavailable",
  "api.subdomainSourceInvalid",
  "api.subdomainSourcesUnavailable",
] as const satisfies readonly MessageKey[];
const sourceMessages = messages["zh-CN"];
const apiMessages = new Map<string, MessageKey>(
  apiMessageKeys.map((key) => [sourceMessages[key], key] as const),
);
apiMessages.set("RDAP · 注册局实时数据", "api.rdapRegistryData");
const upstreamStatus = /^外部数据源暂不可用 \((\d{3})\)$/;

export function localizeApiMessage(message: string): string {
  const upstream = message.match(upstreamStatus);
  if (upstream) return t("api.upstreamUnavailable", [upstream[1]]);
  const key = apiMessages.get(message);
  return key ? t(key) : message;
}
