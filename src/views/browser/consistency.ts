export interface Check {
  name: string;
  status: "一致" | "存在差异" | "检测到特征" | "未发现特征" | "无法检测";
  detail: string;
}
export function platformFamily(value: string) {
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
    name: "UA / 平台",
    status: !left || !right ? "无法检测" : compatible ? "一致" : "存在差异",
    detail: `${left ?? "未知"} / ${right ?? "未知"}。兼容模式和隐私设置也可能影响这些值。`,
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
      ? "存在差异"
      : missing.length
        ? "无法检测"
        : "一致",
    detail: differences.length
      ? `不同字段：${differences.join("、")}`
      : missing.length
        ? `未提供：${missing.join("、")}`
        : "已读取的语言、平台、UA、处理器与时区一致。",
  };
}
