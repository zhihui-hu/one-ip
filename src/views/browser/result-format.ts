import { t } from "@/i18n";

export const labels: Record<string, string> = {
  navigator: t("浏览器环境"),
  canvas: t("Canvas 绘图"),
  audio: t("音频指纹"),
  webgl: t("WebGL 图形"),
  fonts: t("字体列表"),
  clientRects: t("元素布局"),
  ClientRects: t("元素布局"),
  screen: t("屏幕信息"),
  timezone: t("时区"),
  headless: t("无头浏览器特征"),
  prototypeLies: t("原型接口异常"),
  lies: t("数据一致性异常"),
  errors: t("读取错误"),
  userAgentData: t("浏览器客户端提示"),
  domBlockers: t("内容拦截特征"),
  fontPreferences: t("字体渲染偏好"),
  screenFrame: t("屏幕边距"),
  osCpu: t("系统与处理器"),
  languages: t("语言列表"),
  colorDepth: t("色深"),
  deviceMemory: t("内存提示"),
  screenResolution: t("屏幕分辨率"),
  hardwareConcurrency: t("逻辑处理器"),
  sessionStorage: t("会话存储"),
  localStorage: t("本地存储"),
  indexedDB: t("IndexedDB 数据库"),
  openDatabase: t("Web SQL 数据库"),
  cpuClass: t("处理器类别"),
  platform: t("系统平台"),
  plugins: t("浏览器插件"),
  touchSupport: t("触控能力"),
  vendor: t("厂商"),
  vendorFlavors: t("浏览器厂商特征"),
  cookiesEnabled: t("Cookie 支持"),
  colorGamut: t("色域"),
  invertedColors: t("反色偏好"),
  forcedColors: t("强制颜色模式"),
  monochrome: t("单色色阶"),
  contrast: t("对比度偏好"),
  reducedMotion: t("减少动画"),
  reducedTransparency: t("减少透明度"),
  hdr: t("高动态范围"),
  math: t("数学运算指纹"),
  pdfViewerEnabled: t("内置 PDF 阅读器"),
  architecture: t("架构特征"),
  applePay: t("Apple Pay 状态"),
  privateClickMeasurement: t("私密点击归因状态"),
  audioBaseLatency: t("音频基础延迟"),
  dateTimeLocale: t("日期时间区域"),
  webGlBasics: t("WebGL 基础信息"),
  webGlExtensions: t("WebGL 扩展与参数"),
  brands: t("浏览器品牌"),
  brand: t("品牌"),
  version: t("版本"),
  mobile: t("移动设备"),
  bitness: t("架构位数"),
  model: t("设备型号"),
  platformVersion: t("系统版本"),
  userAgent: t("用户代理"),
  appVersion: t("应用版本"),
  language: t("首选语言"),
  maxTouchPoints: t("最大触控点数"),
  touchEvent: t("触控事件"),
  touchStart: t("触控事件入口"),
  renderer: t("渲染器"),
  unmaskedRenderer: t("显卡渲染器"),
  unmaskedVendor: t("显卡厂商"),
  shadingLanguageVersion: t("着色语言版本"),
  width: t("宽度"),
  height: t("高度"),
  availWidth: t("可用宽度"),
  availHeight: t("可用高度"),
  pixelDepth: t("像素深度"),
  lied: t("检测到数据差异"),
  chromium: t("Chromium 内核"),
  likeHeadless: t("类似无头环境的信号"),
  stealth: t("接口异常信号"),
  data: t("记录"),
  totalLies: t("异常记录数"),
  trustedName: t("错误类型"),
  trustedMessage: t("错误说明"),
  permissions: t("权限状态"),
  parameters: t("图形参数"),
  extensions: t("扩展列表"),
  systemFonts: t("系统字体特征"),
  platformEstimate: t("平台推测数据"),
  fontsOS: t("字体对应系统"),
  emojiSet: t("表情渲染样本"),
  sampleSum: t("音频采样总和"),
  noise: t("音频噪声特征"),
  values: t("采样参数"),
  dataURI: t("绘图样本"),
  dataURI2: t("第二绘图样本"),
  pixels: t("像素数据"),
  pixels2: t("第二组像素数据"),
  winding: t("路径填充支持"),
  geometry: t("几何图形样本"),
  text: t("文字绘图样本"),
  noChrome: t("缺少 Chrome 全局对象"),
  hasPermissionsBug: t("通知权限状态不一致"),
  noPlugins: t("插件列表为空"),
  noMimeTypes: t("MIME 类型列表为空"),
  notificationIsDenied: t("通知权限被拒绝"),
  hasKnownBgColor: t("命中特定背景颜色"),
  prefersLightColor: t("偏好浅色外观"),
  uaDataIsBlank: t("客户端提示为空"),
  pdfIsDisabled: t("内置 PDF 阅读器未启用"),
  screenIsAwry: t("屏幕参数存在差异"),
  noTaskbar: t("未观察到任务栏预留空间"),
  noWebShare: t("未提供 Web Share"),
  noContentIndex: t("未提供内容索引"),
  noContactsManager: t("未提供联系人接口"),
  noDownlinkMax: t("未提供最大下行带宽"),
  webDriverIsOn: t("WebDriver 状态或接口异常"),
  hasHeadlessUA: t("UA 含 Headless 标记"),
  hasIframeProxy: t("iframe 接口存在异常"),
  hasHighChromeIndex: t("Chrome 对象出现位置异常"),
  hasBadChromeRuntime: t("Chrome Runtime 行为异常"),
  hasToStringProxy: t("函数字符串转换异常"),
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
export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function valueText(value: unknown): string {
  if (value === null || value === undefined) return t("未提供");
  if (typeof value === "boolean") return value ? t("是") : t("否");
  if (typeof value === "string") {
    if (!value) return t("空值");
    if (value.startsWith("data:image/")) return t("绘图样本（可查看预览）");
    return value.length > 160
      ? t("{0}…（共 {1} 字符）", [value.slice(0, 160), value.length])
      : value;
  }
  if (Array.isArray(value)) {
    if (!value.length) return t("空列表（0 项）");
    if (value.every((item) => item === null || typeof item !== "object"))
      return (
        value.map(valueText).slice(0, 5).join("、") +
        (value.length > 5 ? t(" 等 {0} 项", [value.length]) : "")
      );
    return t("{0} 项记录", [value.length]);
  }
  if (typeof value === "object")
    return t("{0} 个字段", [Object.keys(value).length]);
  return String(value);
}
export function fingerprintSummary(name: string, value: unknown) {
  if (value === null || value === undefined) return t("未提供");
  const data = asRecord(value);
  if (name === "userAgentData")
    return [
      valueText(data.brands),
      data.platform,
      data.architecture,
      data.bitness ? t("{0} 位", [data.bitness]) : "",
    ]
      .filter(Boolean)
      .join(" · ");
  if (name === "languages" && Array.isArray(value))
    return value.flat().map(valueText).join("、");
  if (name === "screenResolution" && Array.isArray(value))
    return value.join(" × ");
  if (name === "deviceMemory" && typeof value === "number")
    return t("{0} GB（近似值）", [value]);
  if (name === "hardwareConcurrency") return t("{0} 个逻辑处理器", [value]);
  if (name === "fonts" && Array.isArray(value))
    return t("{0} 种字体 · {1}", [value.length, value.slice(0, 3).join("、")]);
  if (name === "canvas") return t("已生成文字与几何绘图样本");
  if (name === "webGlBasics")
    return String(
      data.unmaskedRenderer || data.renderer || t("已读取图形接口信息"),
    );
  if (name === "audio" && typeof value === "number" && value < 0)
    return t("未取得有效音频指纹（点击查看状态码）");
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
      t("无法检测"),
      t("未取得结果，可能不支持该接口或读取受限。"),
      [],
      true,
    );
  const data = asRecord(value);
  if (name === "prototypeLies" || name === "lies") {
    const records = name === "lies" ? asRecord(data.data) : data;
    const issues = Object.entries(records)
      .filter(([, entries]) => Array.isArray(entries) && entries.length)
      .map(([key, entries]) =>
        t("{0}：{1} 条异常记录", [key, (entries as unknown[]).length]),
      );
    return result(
      issues.length ? t("发现异常信号") : t("未发现异常信号"),
      issues.length
        ? t("{0} 个接口有异常记录，点击查看具体原因。", [issues.length])
        : t("本次检查未记录接口异常，不代表所有接口都已验证。"),
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
      issues.length ? t("发现相关信号") : t("未发现相关信号"),
      issues.length
        ? t("{0} 项信号：{1}。普通浏览器设置也可能触发。", [
            issues.length,
            issues.slice(0, 3).join("、"),
          ])
        : t("已执行的检查未命中无头或接口异常特征。"),
      issues,
    );
  }
  if (name === "errors") {
    const errors = Array.isArray(data.data) ? data.data : [];
    return result(
      errors.length ? t("存在读取错误") : t("无读取错误"),
      errors.length
        ? t("{0} 条读取错误，相关检测可能不完整；这不是伪装结论。", [
            errors.length,
          ])
        : t("采集过程中未记录读取错误。"),
    );
  }
  if (data.lied === true || (typeof data.lied === "number" && data.lied > 0))
    return result(
      t("发现差异"),
      t("模块记录了数据或接口差异，请结合详情核对。"),
      [t("检测模块的差异标记已触发")],
    );
  const observed =
    name === "fonts" && Array.isArray(data.fonts)
      ? t("读取到 {0} 种字体。", [data.fonts.length])
      : name === "webgl"
        ? String(
            asRecord(data.parameters).UNMASKED_RENDERER_WEBGL ??
              t("已读取图形参数。"),
          )
        : name === "timezone"
          ? String(data.location ?? data.zone ?? t("已读取时区信息。"))
          : t("已取得检测数据。");
  return result(
    data.lied === false || data.lied === 0 ? t("未发现差异") : t("已读取"),
    observed +
      (data.lied === false || data.lied === 0
        ? t(" 本模块未标记差异。")
        : t(" 未提供明确的差异判定。")),
  );
}

export function hasResultValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}
