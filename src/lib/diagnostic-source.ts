export type SourceMethod =
  "unsupported" | "ip-text" | "ip-json" | "headers" | "cftrace";
type LegacySourceMethod = SourceMethod | "netease" | "bytedance";

export type SourceKind = "site-egress" | "ip-api" | "manual" | "unsupported";
export type SourceExecution = "client-request" | "link-only";
export type SourceTargetRegion = "global" | "domestic" | "unknown";
export type SourceAddressFamily = "ipv4" | "ipv6" | "dual-stack" | "unknown";

export interface SourceCommon {
  /** Stable across translations and array reordering. */
  id: string;
  name: string;
  type: string;
  icon: string;
  note?: string;
  extra?: string[];
  groups: string[];
  targetRegion: SourceTargetRegion;
  enabledByDefault: boolean;
  addressFamily: SourceAddressFamily;
  providerFamily?: string;
  sourceUrl: string;
}

export type UnsupportedSourceDefinition = SourceCommon & {
  method: "unsupported";
  kind: "unsupported";
  execution: "link-only";
  domain?: string;
  url?: never;
};

export type CfTraceSourceDefinition = SourceCommon & {
  method: "cftrace";
  kind: "site-egress";
  execution: "client-request";
  domain: string;
  url?: never;
};

export type IpTextSourceDefinition = SourceCommon & {
  method: "ip-text";
  kind: "ip-api";
  execution: "client-request";
  url: string;
  domain?: never;
};

export type IpJsonSourceDefinition = SourceCommon & {
  method: "ip-json";
  kind: "ip-api";
  execution: "client-request";
  url: string;
  domain?: never;
};

export type HeaderSourceDefinition = SourceCommon & {
  method: "headers";
  kind: "ip-api";
  execution: "client-request";
  url: string;
  responseHeader: string;
  domain?: never;
};

export type DiscriminatedSourceDefinition =
  | UnsupportedSourceDefinition
  | CfTraceSourceDefinition
  | IpTextSourceDefinition
  | IpJsonSourceDefinition
  | HeaderSourceDefinition;

export type SourceDefinition = DiscriminatedSourceDefinition;

const sourceMethods = new Set<LegacySourceMethod>([
  "unsupported",
  "ip-text",
  "ip-json",
  "netease",
  "bytedance",
  "headers",
  "cftrace",
]);

const neteaseDefaultUrl =
  "https://necaptcha.nosdn.127.net/ab7f4275c1744aa28e0a8f3a1c58c532.png";
const bytedanceDefaultUrl = "https://perfops.byte-test.com/500b-bench.jpg";
const sourceFields = new Set([
  "id",
  "name",
  "type",
  "icon",
  "note",
  "extra",
  "method",
  "domain",
  "url",
  "groups",
  "targetRegion",
  "execution",
  "enabledByDefault",
  "kind",
  "sourceUrl",
  "responseHeader",
  "providerFamily",
  "addressFamily",
]);

type RawSource = Record<string, unknown>;

function fail(index: number, message: string): never {
  throw new Error(`来源配置 #${index + 1} 无效：${message}`);
}

function record(value: unknown, index: number): RawSource {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(index, "必须是对象");
  return value as RawSource;
}

function requiredString(source: RawSource, key: string, index: number): string {
  const value = source[key];
  if (typeof value !== "string" || value.trim() === "")
    fail(index, `${key} 必须是非空字符串`);
  return value;
}

function optionalString(
  source: RawSource,
  key: string,
  index: number,
): string | undefined {
  const value = source[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "")
    fail(index, `${key} 必须是非空字符串`);
  return value;
}

function optionalStringList(
  source: RawSource,
  key: string,
  index: number,
): string[] | undefined {
  const value = source[key];
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string"))
    fail(index, `${key} 必须是字符串数组`);
  return [...value];
}

function assertHttpsUrl(value: string, field: string, index: number) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    fail(index, `${field} 不是有效 URL`);
  }
  if (parsed.protocol !== "https:") fail(index, `${field} 必须使用 HTTPS`);
  if (parsed.username || parsed.password || parsed.hash)
    fail(index, `${field} 不应包含凭据或片段`);
}

function sourceUrlFromDomain(domain: string, index: number) {
  if (domain.includes("://") || /[\s/?#@:\\]/.test(domain))
    fail(index, "domain 必须是主机名");
  const value = `https://${domain}`;
  assertHttpsUrl(value, "domain", index);
  return value;
}

function targetRegion(type: string): SourceTargetRegion {
  if (type === "domestic") return "domestic";
  if (type === "international") return "global";
  return "unknown";
}

function checkNoField(
  source: RawSource,
  key: string,
  method: LegacySourceMethod,
  index: number,
) {
  if (source[key] !== undefined) fail(index, `${method} 不应配置 ${key}`);
}

function checkExecution(
  source: RawSource,
  expected: SourceExecution,
  index: number,
) {
  const execution = source.execution;
  if (execution !== undefined && execution !== expected)
    fail(index, `execution 必须是 ${expected}`);
}

function checkKind(source: RawSource, expected: SourceKind, index: number) {
  const kind = source.kind;
  if (kind !== undefined && kind !== expected)
    fail(index, `kind 必须是 ${expected}`);
}

function common(
  source: RawSource,
  index: number,
  sourceUrl: string,
  enabledByDefault: boolean,
) {
  const enabled = source.enabledByDefault ?? enabledByDefault;
  if (typeof enabled !== "boolean" || (!enabledByDefault && enabled))
    fail(index, "enabledByDefault 与来源能力不一致");
  const addressFamily = source.addressFamily ?? "unknown";
  if (
    !["ipv4", "ipv6", "dual-stack", "unknown"].includes(String(addressFamily))
  )
    fail(index, "addressFamily 无效");
  const id = requiredString(source, "id", index);
  if (!/^[a-z0-9][a-z0-9._:-]*$/i.test(id))
    fail(index, "id 只能包含字母、数字、点、下划线、冒号和连字符");
  const type = requiredString(source, "type", index);
  const icon = requiredString(source, "icon", index);
  assertHttpsUrl(icon, "icon", index);
  if (sourceUrl) assertHttpsUrl(sourceUrl, "sourceUrl", index);
  const configuredSourceUrl = optionalString(source, "sourceUrl", index);
  if (configuredSourceUrl !== undefined && configuredSourceUrl !== sourceUrl)
    fail(index, "sourceUrl 与 method/domain/url 不一致");
  const extra = optionalStringList(source, "extra", index);
  const expectedGroups = [...new Set([...(extra ?? []), type])];
  const configuredGroups = optionalStringList(source, "groups", index);
  if (
    configuredGroups &&
    (configuredGroups.length !== expectedGroups.length ||
      configuredGroups.some((group) => !expectedGroups.includes(group)))
  )
    fail(index, "groups 与 type/extra 不一致");
  const expectedRegion = targetRegion(type);
  if (
    source.targetRegion !== undefined &&
    source.targetRegion !== expectedRegion
  )
    fail(index, `targetRegion 必须是 ${expectedRegion}`);
  return {
    id,
    name: requiredString(source, "name", index),
    type,
    icon,
    note: optionalString(source, "note", index),
    extra,
    groups: expectedGroups,
    targetRegion: expectedRegion,
    enabledByDefault: enabled,
    addressFamily: addressFamily as SourceAddressFamily,
    providerFamily: optionalString(source, "providerFamily", index),
    sourceUrl,
  };
}

function normalizeSource(
  value: unknown,
  index: number,
): DiscriminatedSourceDefinition {
  const source = record(value, index);
  const unknown = Object.keys(source).find((key) => !sourceFields.has(key));
  if (unknown) fail(index, `未知字段：${unknown}`);
  const rawMethod = requiredString(source, "method", index);
  if (!sourceMethods.has(rawMethod as LegacySourceMethod))
    fail(index, `未知 method：${rawMethod}`);
  const method = rawMethod as LegacySourceMethod;
  if (!["headers", "netease", "bytedance"].includes(method))
    checkNoField(source, "responseHeader", method, index);

  switch (method) {
    case "unsupported": {
      checkExecution(source, "link-only", index);
      checkKind(source, "unsupported", index);
      checkNoField(source, "url", "unsupported", index);
      const domain = optionalString(source, "domain", index);
      const sourceUrl = domain ? sourceUrlFromDomain(domain, index) : "";
      const base = common(source, index, sourceUrl, false);
      return {
        ...base,
        method: "unsupported",
        kind: "unsupported",
        execution: "link-only",
        domain,
      };
    }
    case "cftrace": {
      checkExecution(source, "client-request", index);
      checkKind(source, "site-egress", index);
      checkNoField(source, "url", "cftrace", index);
      const domain = requiredString(source, "domain", index);
      const base = common(
        source,
        index,
        sourceUrlFromDomain(domain, index),
        true,
      );
      return {
        ...base,
        method: "cftrace",
        kind: "site-egress",
        execution: "client-request",
        domain,
      };
    }
    case "ip-text":
    case "ip-json": {
      checkExecution(source, "client-request", index);
      checkKind(source, "ip-api", index);
      checkNoField(source, "domain", method, index);
      const url = requiredString(source, "url", index);
      assertHttpsUrl(url, "url", index);
      const base = common(source, index, url, true);
      return {
        ...base,
        method,
        kind: "ip-api",
        execution: "client-request",
        url,
      };
    }
    case "netease":
    case "bytedance":
    case "headers": {
      checkExecution(source, "client-request", index);
      checkKind(source, "ip-api", index);
      checkNoField(source, "domain", method, index);
      const url =
        method === "headers"
          ? requiredString(source, "url", index)
          : (optionalString(source, "url", index) ??
            (method === "netease" ? neteaseDefaultUrl : bytedanceDefaultUrl));
      assertHttpsUrl(url, "url", index);
      const responseHeader =
        method === "headers"
          ? requiredString(source, "responseHeader", index).toLowerCase()
          : method === "netease"
            ? "cdn-user-ip"
            : "x-request-ip";
      if (!/^[a-z0-9-]+$/.test(responseHeader))
        fail(index, "responseHeader 无效");
      if (
        method !== "headers" &&
        source.responseHeader !== undefined &&
        source.responseHeader !== responseHeader
      )
        fail(index, "responseHeader 与来源不一致");
      const base = common(source, index, url, true);
      return {
        ...base,
        method: "headers",
        kind: "ip-api",
        execution: "client-request",
        url,
        responseHeader,
      };
    }
  }
}

export function buildSourceRegistry(
  rawSources: readonly unknown[],
): SourceDefinition[] {
  const definitions = rawSources.map(normalizeSource);
  const ids = new Set<string>();
  for (let index = 0; index < definitions.length; index += 1) {
    const source = definitions[index];
    if (ids.has(source.id)) fail(index, `id 重复：${source.id}`);
    ids.add(source.id);
  }
  return definitions;
}
