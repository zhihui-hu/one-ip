export const labels: Record<string, string> = {
  navigator: "浏览器环境",
  canvas: "Canvas 绘图",
  audio: "音频指纹",
  webgl: "WebGL 图形",
  fonts: "字体列表",
  clientRects: "元素布局",
  ClientRects: "元素布局",
  screen: "屏幕信息",
  timezone: "时区",
  headless: "无头浏览器特征",
  prototypeLies: "原型接口异常",
  lies: "数据一致性异常",
  errors: "读取错误",
  userAgentData: "浏览器客户端提示",
  domBlockers: "内容拦截特征",
  fontPreferences: "字体渲染偏好",
  screenFrame: "屏幕边距",
  osCpu: "系统与处理器",
  languages: "语言列表",
  colorDepth: "色深",
  deviceMemory: "内存提示",
  screenResolution: "屏幕分辨率",
  hardwareConcurrency: "逻辑处理器",
  sessionStorage: "会话存储",
  localStorage: "本地存储",
  indexedDB: "IndexedDB 数据库",
  openDatabase: "Web SQL 数据库",
  cpuClass: "处理器类别",
  platform: "系统平台",
  plugins: "浏览器插件",
  touchSupport: "触控能力",
  vendor: "厂商",
  vendorFlavors: "浏览器厂商特征",
  cookiesEnabled: "Cookie 支持",
  colorGamut: "色域",
  invertedColors: "反色偏好",
  forcedColors: "强制颜色模式",
  monochrome: "单色色阶",
  contrast: "对比度偏好",
  reducedMotion: "减少动画",
  reducedTransparency: "减少透明度",
  hdr: "高动态范围",
  math: "数学运算指纹",
  pdfViewerEnabled: "内置 PDF 阅读器",
  architecture: "架构特征",
  applePay: "Apple Pay 状态",
  privateClickMeasurement: "私密点击归因状态",
  audioBaseLatency: "音频基础延迟",
  dateTimeLocale: "日期时间区域",
  webGlBasics: "WebGL 基础信息",
  webGlExtensions: "WebGL 扩展与参数",
  brands: "浏览器品牌",
  brand: "品牌",
  version: "版本",
  mobile: "移动设备",
  bitness: "架构位数",
  model: "设备型号",
  platformVersion: "系统版本",
  userAgent: "用户代理",
  appVersion: "应用版本",
  language: "首选语言",
  maxTouchPoints: "最大触控点数",
  touchEvent: "触控事件",
  touchStart: "触控事件入口",
  renderer: "渲染器",
  unmaskedRenderer: "显卡渲染器",
  unmaskedVendor: "显卡厂商",
  shadingLanguageVersion: "着色语言版本",
  width: "宽度",
  height: "高度",
  availWidth: "可用宽度",
  availHeight: "可用高度",
  pixelDepth: "像素深度",
  lied: "检测到数据差异",
  chromium: "Chromium 内核",
  likeHeadless: "类似无头环境的信号",
  stealth: "接口异常信号",
  data: "记录",
  totalLies: "异常记录数",
  trustedName: "错误类型",
  trustedMessage: "错误说明",
  permissions: "权限状态",
  parameters: "图形参数",
  extensions: "扩展列表",
  systemFonts: "系统字体特征",
  platformEstimate: "平台推测数据",
  fontsOS: "字体对应系统",
  emojiSet: "表情渲染样本",
  sampleSum: "音频采样总和",
  noise: "音频噪声特征",
  values: "采样参数",
  dataURI: "绘图样本",
  dataURI2: "第二绘图样本",
  pixels: "像素数据",
  pixels2: "第二组像素数据",
  winding: "路径填充支持",
  geometry: "几何图形样本",
  text: "文字绘图样本",
  noChrome: "缺少 Chrome 全局对象",
  hasPermissionsBug: "通知权限状态不一致",
  noPlugins: "插件列表为空",
  noMimeTypes: "MIME 类型列表为空",
  notificationIsDenied: "通知权限被拒绝",
  hasKnownBgColor: "命中特定背景颜色",
  prefersLightColor: "偏好浅色外观",
  uaDataIsBlank: "客户端提示为空",
  pdfIsDisabled: "内置 PDF 阅读器未启用",
  screenIsAwry: "屏幕参数存在差异",
  noTaskbar: "未观察到任务栏预留空间",
  noWebShare: "未提供 Web Share",
  noContentIndex: "未提供内容索引",
  noContactsManager: "未提供联系人接口",
  noDownlinkMax: "未提供最大下行带宽",
  webDriverIsOn: "WebDriver 状态或接口异常",
  hasHeadlessUA: "UA 含 Headless 标记",
  hasIframeProxy: "iframe 接口存在异常",
  hasHighChromeIndex: "Chrome 对象出现位置异常",
  hasBadChromeRuntime: "Chrome Runtime 行为异常",
  hasToStringProxy: "函数字符串转换异常",
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
  if (value === null || value === undefined) return "未提供";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "string") {
    if (!value) return "空值";
    if (value.startsWith("data:image/")) return "绘图样本（可查看预览）";
    return value.length > 160
      ? `${value.slice(0, 160)}…（共 ${value.length} 字符）`
      : value;
  }
  if (Array.isArray(value)) {
    if (!value.length) return "空列表（0 项）";
    if (value.every((item) => item === null || typeof item !== "object"))
      return (
        value.map(valueText).slice(0, 5).join("、") +
        (value.length > 5 ? ` 等 ${value.length} 项` : "")
      );
    return `${value.length} 项记录`;
  }
  if (typeof value === "object") return `${Object.keys(value).length} 个字段`;
  return String(value);
}
export function fingerprintSummary(name: string, value: unknown) {
  if (value === null || value === undefined) return "未提供";
  const data = asRecord(value);
  if (name === "userAgentData")
    return [
      valueText(data.brands),
      data.platform,
      data.architecture,
      data.bitness ? `${data.bitness} 位` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  if (name === "languages" && Array.isArray(value))
    return value.flat().map(valueText).join("、");
  if (name === "screenResolution" && Array.isArray(value))
    return value.join(" × ");
  if (name === "deviceMemory" && typeof value === "number")
    return `${value} GB（近似值）`;
  if (name === "hardwareConcurrency") return `${value} 个逻辑处理器`;
  if (name === "fonts" && Array.isArray(value))
    return `${value.length} 种字体 · ${value.slice(0, 3).join("、")}`;
  if (name === "canvas") return "已生成文字与几何绘图样本";
  if (name === "webGlBasics")
    return String(
      data.unmaskedRenderer || data.renderer || "已读取图形接口信息",
    );
  if (name === "audio" && typeof value === "number" && value < 0)
    return "未取得有效音频指纹（点击查看状态码）";
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
      "无法检测",
      "未取得结果，可能不支持该接口或读取受限。",
      [],
      true,
    );
  const data = asRecord(value);
  if (name === "prototypeLies" || name === "lies") {
    const records = name === "lies" ? asRecord(data.data) : data;
    const issues = Object.entries(records)
      .filter(([, entries]) => Array.isArray(entries) && entries.length)
      .map(
        ([key, entries]) =>
          `${key}：${(entries as unknown[]).length} 条异常记录`,
      );
    return result(
      issues.length ? "发现异常信号" : "未发现异常信号",
      issues.length
        ? `${issues.length} 个接口有异常记录，点击查看具体原因。`
        : "本次检查未记录接口异常，不代表所有接口都已验证。",
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
      issues.length ? "发现相关信号" : "未发现相关信号",
      issues.length
        ? `${issues.length} 项信号：${issues.slice(0, 3).join("、")}。普通浏览器设置也可能触发。`
        : "已执行的检查未命中无头或接口异常特征。",
      issues,
    );
  }
  if (name === "errors") {
    const errors = Array.isArray(data.data) ? data.data : [];
    return result(
      errors.length ? "存在读取错误" : "无读取错误",
      errors.length
        ? `${errors.length} 条读取错误，相关检测可能不完整；这不是伪装结论。`
        : "采集过程中未记录读取错误。",
    );
  }
  if (data.lied === true || (typeof data.lied === "number" && data.lied > 0))
    return result("发现差异", "模块记录了数据或接口差异，请结合详情核对。", [
      "检测模块的差异标记已触发",
    ]);
  const observed =
    name === "fonts" && Array.isArray(data.fonts)
      ? `读取到 ${data.fonts.length} 种字体。`
      : name === "webgl"
        ? String(
            asRecord(data.parameters).UNMASKED_RENDERER_WEBGL ??
              "已读取图形参数。",
          )
        : name === "timezone"
          ? String(data.location ?? data.zone ?? "已读取时区信息。")
          : "已取得检测数据。";
  return result(
    data.lied === false || data.lied === 0 ? "未发现差异" : "已读取",
    observed +
      (data.lied === false || data.lied === 0
        ? " 本模块未标记差异。"
        : " 未提供明确的差异判定。"),
  );
}

export function hasResultValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}
