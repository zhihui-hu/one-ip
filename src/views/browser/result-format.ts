import { t } from "@/i18n";

const labels: Record<string, string> = {
  navigator: t("common.browserEnvironment"),
  canvas: t("browser.results.canvasDrawing"),
  audio: t("browser.results.audioFingerprint"),
  webgl: t("browser.results.webglGraphics"),
  fonts: t("browser.results.fontList"),
  clientRects: t("browser.results.elementLayout"),
  ClientRects: t("browser.results.elementLayout"),
  screen: t("browser.results.screenInformation"),
  timezone: t("common.timezone"),
  headless: t("browser.results.headlessBrowserSignals"),
  prototypeLies: t("browser.results.prototypeApiAnomalies"),
  lies: t("browser.results.dataConsistencyAnomalies"),
  errors: t("browser.results.readErrors"),
  userAgentData: t("browser.results.browserClientHints"),
  domBlockers: t("browser.results.contentBlockingSignals"),
  fontPreferences: t("browser.results.fontRenderingPreferences"),
  screenFrame: t("browser.results.screenMargins"),
  osCpu: t("browser.results.osAndCpu"),
  languages: t("browser.results.languages"),
  colorDepth: t("common.colorDepth"),
  deviceMemory: t("common.memoryHint"),
  screenResolution: t("browser.results.screenResolution"),
  hardwareConcurrency: t("common.logicalProcessors"),
  sessionStorage: t("browser.results.sessionStorage"),
  localStorage: t("common.localStorage"),
  indexedDB: t("browser.results.indexeddbDatabase"),
  openDatabase: t("browser.results.webSqlDatabase"),
  cpuClass: t("browser.results.cpuClass"),
  platform: t("browser.results.systemPlatform"),
  plugins: t("browser.results.browserPlugins"),
  touchSupport: t("browser.results.touchSupport"),
  vendor: t("common.vendor"),
  vendorFlavors: t("browser.results.browserVendorSignals"),
  cookiesEnabled: t("browser.results.cookieSupport"),
  colorGamut: t("browser.results.colorGamut"),
  invertedColors: t("browser.results.invertedColorPreference"),
  forcedColors: t("browser.results.forcedColorMode"),
  monochrome: t("browser.results.monochromeDepth"),
  contrast: t("browser.results.contrastPreference"),
  reducedMotion: t("browser.results.reducedMotion"),
  reducedTransparency: t("browser.results.reducedTransparency"),
  hdr: t("browser.results.highDynamicRange"),
  math: t("browser.results.mathFingerprint"),
  pdfViewerEnabled: t("browser.results.builtInPdfViewer"),
  architecture: t("browser.results.architectureSignals"),
  applePay: t("browser.results.applePayStatus"),
  privateClickMeasurement: t("browser.results.privateClickMeasurement"),
  audioBaseLatency: t("browser.results.audioBaseLatency"),
  dateTimeLocale: t("browser.results.dateTimeLocale"),
  webGlBasics: t("browser.results.webglBasics"),
  webGlExtensions: t("browser.results.webglExtensionsAndParameters"),
  brands: t("browser.results.browserBrands"),
  brand: t("browser.results.brand"),
  version: t("browser.results.version"),
  mobile: t("browser.results.mobileDevice"),
  bitness: t("browser.results.architectureBitness"),
  model: t("browser.results.deviceModel"),
  platformVersion: t("browser.results.osVersion"),
  userAgent: t("browser.results.userAgent"),
  appVersion: t("browser.results.appVersion"),
  language: t("common.preferredLanguage"),
  maxTouchPoints: t("browser.results.maximumTouchPoints"),
  touchEvent: t("browser.results.touchEvents"),
  touchStart: t("browser.results.touchEventEntryPoint"),
  renderer: t("browser.results.renderer"),
  unmaskedRenderer: t("browser.results.gpuRenderer"),
  unmaskedVendor: t("browser.results.gpuVendor"),
  shadingLanguageVersion: t("browser.results.shadingLanguageVersion"),
  width: t("browser.results.width"),
  height: t("browser.results.height"),
  availWidth: t("browser.results.availableWidth"),
  availHeight: t("browser.results.availableHeight"),
  pixelDepth: t("browser.results.pixelDepth"),
  lied: t("browser.results.dataDifferencesDetected"),
  chromium: t("browser.results.chromiumEngine"),
  likeHeadless: t("browser.results.headlessLikeSignals"),
  stealth: t("browser.results.apiAnomalySignals"),
  data: t("browser.results.records"),
  totalLies: t("browser.results.anomalyCount"),
  trustedName: t("browser.results.errorType"),
  trustedMessage: t("browser.results.errorDescription"),
  permissions: t("browser.results.permissionStatus"),
  parameters: t("browser.results.graphicsParameters"),
  extensions: t("browser.results.extensions"),
  systemFonts: t("browser.results.systemFontSignals"),
  platformEstimate: t("browser.results.inferredPlatformData"),
  fontsOS: t("browser.results.fontOsMatches"),
  emojiSet: t("browser.results.emojiRenderingSample"),
  sampleSum: t("browser.results.audioSampleSum"),
  noise: t("browser.results.audioNoiseSignals"),
  values: t("browser.results.sampleParameters"),
  dataURI: t("browser.results.drawingSample"),
  dataURI2: t("browser.results.secondDrawingSample"),
  pixels: t("browser.results.pixelData"),
  pixels2: t("browser.results.secondPixelDataset"),
  winding: t("browser.results.pathFillSupport"),
  geometry: t("browser.results.geometrySample"),
  text: t("browser.results.textDrawingSample"),
  noChrome: t("browser.results.chromeGlobalObjectMissing"),
  hasPermissionsBug: t("browser.results.inconsistentNotificationPermissions"),
  noPlugins: t("browser.results.emptyPluginList"),
  noMimeTypes: t("browser.results.emptyMimeTypeList"),
  notificationIsDenied: t("browser.results.notificationPermissionDenied"),
  hasKnownBgColor: t("browser.results.specificBackgroundColorMatched"),
  prefersLightColor: t("browser.results.prefersLightAppearance"),
  uaDataIsBlank: t("browser.results.emptyClientHints"),
  pdfIsDisabled: t("browser.results.builtInPdfViewerDisabled"),
  screenIsAwry: t("browser.results.screenParameterDifferences"),
  noTaskbar: t("browser.results.noTaskbarSpaceObserved"),
  noWebShare: t("browser.results.webShareNotProvided"),
  noContentIndex: t("browser.results.contentIndexNotProvided"),
  noContactsManager: t("browser.results.contactsApiNotProvided"),
  noDownlinkMax: t("browser.results.maximumDownlinkNotProvided"),
  webDriverIsOn: t("browser.results.webdriverStateOrApiAnomaly"),
  hasHeadlessUA: t("browser.results.uaContainsHeadlessMarker"),
  hasIframeProxy: t("browser.results.iframeApiAnomalies"),
  hasHighChromeIndex: t("browser.results.chromeObjectInUnexpectedContext"),
  hasBadChromeRuntime: t("browser.results.unusualChromeRuntimeBehavior"),
  hasToStringProxy: t("browser.results.unusualFunctionStringConversion"),
};
export function fieldLabel(key: string) {
  return labels[key] ?? key;
}
export function parseDetail(detail: string | undefined): unknown {
  if (detail === undefined) return undefined;
  try {
    return JSON.parse(detail);
  } catch {
    return detail;
  }
}
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function valueText(value: unknown): string {
  if (value === null || value === undefined) return t("common.notProvided");
  if (typeof value === "boolean")
    return value ? t("common.yes") : t("common.no");
  if (typeof value === "string") {
    if (!value) return t("browser.results.null");
    if (value.startsWith("data:image/"))
      return t("browser.results.drawingSamplePreviewAvailable");
    return value.length > 160
      ? t("browser.results.charactersInTotal", [
          value.slice(0, 160),
          value.length,
        ])
      : value;
  }
  if (Array.isArray(value)) {
    if (!value.length) return t("browser.results.emptyList0Items");
    if (value.every((item) => item === null || typeof item !== "object"))
      return (
        value.map(valueText).slice(0, 5).join("、") +
        (value.length > 5
          ? t("browser.results.andOthersItems", [value.length])
          : "")
      );
    return t("browser.results.recordCount", [value.length]);
  }
  if (typeof value === "object")
    return t("browser.results.fieldCount", [Object.keys(value).length]);
  return String(value);
}
export function fingerprintSummary(name: string, value: unknown) {
  if (value === null || value === undefined) return t("common.notProvided");
  const data = asRecord(value);
  if (name === "userAgentData")
    return [
      valueText(data.brands),
      data.platform,
      data.architecture,
      data.bitness ? t("browser.results.bitCount", [data.bitness]) : "",
    ]
      .filter(Boolean)
      .join(" · ");
  if (name === "languages" && Array.isArray(value))
    return value.flat().map(valueText).join("、");
  if (name === "screenResolution" && Array.isArray(value))
    return value.join(" × ");
  if (name === "deviceMemory" && typeof value === "number")
    return t("browser.results.approximateGigabytes", [value]);
  if (name === "hardwareConcurrency")
    return t("browser.results.processorCount", [value]);
  if (name === "fonts" && Array.isArray(value))
    return t("browser.results.fontCountAndNames", [
      value.length,
      value.slice(0, 3).join("、"),
    ]);
  if (name === "canvas")
    return t("browser.results.textAndGeometryDrawingSamplesGenerated");
  if (name === "webGlBasics")
    return String(
      data.unmaskedRenderer ||
        data.renderer ||
        t("browser.results.graphicsApiInformationCollected"),
    );
  if (name === "audio" && typeof value === "number" && value < 0)
    return t("browser.results.noValidAudioFingerprintClickForStatusCode");
  return valueText(value);
}
export type ModuleReport = {
  status: string;
  summary: string;
  signal: boolean;
  unavailable: boolean;
  issues: string[];
};
export function moduleReport(name: string, value: unknown): ModuleReport {
  const result = (
    status: string,
    summary: string,
    issues: string[] = [],
    unavailable = false,
  ): ModuleReport => ({
    status,
    summary,
    issues,
    signal: issues.length > 0,
    unavailable,
  });
  if (value === null || value === undefined)
    return result(
      t("browser.check.unavailable"),
      t("browser.results.resultApiMayUnsupportedAccessRestricted"),
      [],
      true,
    );
  const data = asRecord(value);
  if (name === "prototypeLies" || name === "lies") {
    const records = name === "lies" ? asRecord(data.data) : data;
    const issues = Object.entries(records)
      .filter(([, entries]) => Array.isArray(entries) && entries.length)
      .map(([key, entries]) =>
        t("browser.results.namedAnomalyCount", [
          key,
          (entries as unknown[]).length,
        ]),
      );
    return result(
      issues.length
        ? t("browser.results.unusualSignalsFound")
        : t("browser.results.noUnusualSignalsFound"),
      issues.length
        ? t("browser.results.apiAnomalySummary", [issues.length])
        : t("browser.results.apiAnomaliesWereRecordedCheckAllApisHave"),
      issues,
    );
  }
  if (name === "headless") {
    const issues = ["headless", "likeHeadless", "stealth"].flatMap((group) =>
      Object.entries(asRecord(data[group]))
        .filter(([, hit]) => hit === true)
        .map(([key]) => fieldLabel(key)),
    );
    return result(
      issues.length
        ? t("browser.results.relatedSignalsFound")
        : t("browser.results.noRelatedSignalsFound"),
      issues.length
        ? t(
            "browser.results.signalsOrdinaryBrowserSettingsMayAlsoTriggerThese",
            [issues.length, issues.slice(0, 3).join("、")],
          )
        : t("browser.results.checksPerformedDidMatchHeadlessApiAnomalySignals"),
      issues,
    );
  }
  if (name === "errors") {
    const errors = Array.isArray(data.data) ? data.data : [];
    return result(
      errors.length
        ? t("common.readErrorsFound")
        : t("browser.results.noReadErrors"),
      errors.length
        ? t("browser.results.readErrorSummary", [errors.length])
        : t("browser.results.noReadErrorsWereRecordedDuringCollection"),
    );
  }
  if (data.lied === true || (typeof data.lied === "number" && data.lied > 0))
    return result(
      t("browser.results.differencesFound"),
      t("browser.results.moduleRecordedDataApiDifferencesReviewDetails"),
      [t("browser.results.theModuleSDifferenceFlagWasTriggered")],
    );
  const observed =
    name === "fonts" && Array.isArray(data.fonts)
      ? t("browser.results.readFonts", [data.fonts.length])
      : name === "webgl"
        ? String(
            asRecord(data.parameters).UNMASKED_RENDERER_WEBGL ??
              t("browser.results.graphicsParametersCollected"),
          )
        : name === "timezone"
          ? String(
              data.location ??
                data.zone ??
                t("browser.results.timezoneInformationCollected"),
            )
          : t("browser.results.diagnosticDataCollected");
  return result(
    data.lied === false || data.lied === 0
      ? t("browser.results.noDifferencesFound")
      : t("browser.results.readLabel"),
    observed +
      (data.lied === false || data.lied === 0
        ? t("browser.results.thisModuleDidNotFlagDifferencesLabel")
        : t("browser.results.noExplicitDifferenceAssessmentProvidedLabel")),
  );
}

export function hasResultValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}
