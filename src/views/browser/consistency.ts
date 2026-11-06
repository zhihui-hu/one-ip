import { t } from "@/i18n";

export interface Check {
  name: string;
  status:
    "consistent" | "different" | "detected" | "not-detected" | "unavailable";
  detail: string;
}
function platformFamily(value: string) {
  if (/Android/i.test(value)) return "Android";
  if (/iPhone|iPad|iPod|iOS/i.test(value)) return "iOS";
  if (/Windows|Win32|Win64/i.test(value)) return "Windows";
  if (/CrOS/i.test(value)) return "ChromeOS";
  if (/Mac/i.test(value)) return "macOS";
  if (/Linux/i.test(value)) return "Linux";
  return null;
}
export function comparePlatforms(
  ua: string,
  platform: string,
  touchPoints: number,
): Check {
  const left = platformFamily(ua),
    right = platformFamily(platform);
  // Android exposes Linux; iPad desktop mode can report MacIntel.
  const compatible =
    left === right ||
    (left === "Android" && right === "Linux") ||
    (left === "ChromeOS" && right === "Linux") ||
    (left === "iOS" && right === "macOS" && touchPoints > 1);
  return {
    name: t("browser.uaPlatform"),
    status:
      !left || !right ? "unavailable" : compatible ? "consistent" : "different",
    detail: t("browser.platformComparisonDetail", [
      left ?? t("common.unknown"),
      right ?? t("common.unknown"),
    ]),
  };
}
export function compareContexts(
  main: Record<string, unknown>,
  other: Record<string, unknown>,
  name: string,
): Check {
  const keys = [
    "userAgent",
    "platform",
    "language",
    "languages",
    "hardwareConcurrency",
    "timezone",
  ];
  const missing = keys.filter(
    (key) => main[key] === undefined || other[key] === undefined,
  );
  const differences = keys.filter(
    (key) =>
      !missing.includes(key) &&
      JSON.stringify(main[key]) !== JSON.stringify(other[key]),
  );
  return {
    name,
    status: differences.length
      ? "different"
      : missing.length
        ? "unavailable"
        : "consistent",
    detail: differences.length
      ? t("browser.differentFieldsList", [differences.join("、")])
      : missing.length
        ? t("browser.missingFieldsList", [missing.join("、")])
        : t("browser.availableLanguagePlatformUaProcessorTimezoneValuesMatch"),
  };
}
