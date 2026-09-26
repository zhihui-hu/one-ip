import { toolGroups } from "@/layout/routes";
import { endpoint, trace } from "@/lib/network";
import { aiPlatforms } from "@/views/ai/platforms";
import { providers } from "@/views/cdn/providers";
import egressSites from "@/views/home/sites.json";
import connectivityTargets from "@/views/link/targets.json";
import services from "@/views/status/services.json";

type Input = Record<string, unknown>;
export type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    consequentialHint?: boolean;
    untrustedContentHint?: boolean;
  };
  execute: (input: Input, options: { signal: AbortSignal }) => unknown;
};
export type ModelContext = {
  registerTool: (tool: Tool, options: { signal: AbortSignal }) => Promise<void>;
};

const empty = { type: "object", properties: {} };
const text = (description: string) => ({ type: "string", description });
const pages = [
  "/",
  "/network",
  "/browser",
  "/ai",
  "/status",
  "/status/openai",
  "/status/claude",
  "/docs/api",
  "/terms",
  "/privacy",
  ...Object.values(toolGroups)
    .flat()
    .map((route) => route.path),
];

function required(input: Input, key: string, max = 253) {
  const value = input[key];
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error(
      `${key} must be a non-empty string of at most ${max} characters`,
    );
  return value.trim();
}

function ipAddress(input: Input) {
  const ip = required(input, "ip", 45);
  if (ip.includes(":")) {
    try {
      new URL(`https://[${ip}]/`);
      return ip;
    } catch {
      throw new Error("Enter a valid IPv6 address");
    }
  }
  const parts = ip.split(".");
  if (
    parts.length !== 4 ||
    parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)
  )
    throw new Error("Enter a valid IPv4 address");
  return ip;
}

function selected<T extends { name: string }>(
  items: T[],
  name: string,
  label: string,
) {
  const found = items.find(
    (item) => item.name.toLowerCase() === name.toLowerCase(),
  );
  if (!found) throw new Error(`Unknown ${label}: ${name}`);
  return found;
}

export function createWebMcpTools(navigate: (path: string) => void): Tool[] {
  return [
    {
      name: "one_ip_open_page",
      description:
        "Open a One IP diagnostics page, including interactive browser permission and human verification pages.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            enum: pages,
            description: "Exact One IP page path",
          },
        },
        required: ["path"],
      },
      execute: (input) => {
        const path = required(input, "path");
        if (!pages.includes(path)) throw new Error("Unknown One IP page path");
        navigate(path);
        return { page: path };
      },
    },
    {
      name: "one_ip_current_ip",
      description:
        "Get the IP address and geography observed by One IP's own server for this browser connection.",
      inputSchema: empty,
      annotations: { readOnlyHint: true },
      execute: async (_, { signal }) => {
        const { currentIp } = await import("@/views/ip/api");
        signal.throwIfAborted();
        return currentIp(signal);
      },
    },
    {
      name: "one_ip_browser_egress",
      description:
        "Read an IP exit observed directly by this browser: IPv4, IPv6, mainland China, or Cloudflare. A source can be unavailable because of network or CORS restrictions.",
      inputSchema: {
        type: "object",
        properties: {
          source: {
            type: "string",
            enum: ["ipv4", "ipv6", "domestic", "cloudflare"],
          },
        },
        required: ["source"],
      },
      annotations: { readOnlyHint: true },
      execute: async (input, { signal }) => {
        const source = required(input, "source", 20);
        const { getBrowserIp, getDomesticIp } =
          await import("@/views/home/api");
        signal.throwIfAborted();
        if (source === "ipv4") return getBrowserIp(4, signal);
        if (source === "ipv6") return getBrowserIp(6, signal);
        if (source === "domestic") return getDomesticIp(signal);
        if (source === "cloudflare") return trace("1.1.1.1", signal);
        throw new Error(`Unknown browser egress source: ${source}`);
      },
    },
    {
      name: "one_ip_lookup_ip",
      description:
        "Look up the supplied IPv4 or IPv6 address, including location, ASN, reputation, and risk data from Net.Coffee. Returns source data; results are third-party content.",
      inputSchema: {
        type: "object",
        properties: { ip: text("IPv4 or IPv6 address to inspect") },
        required: ["ip"],
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input, { signal }) => {
        const ip = ipAddress(input);
        const { lookupIp } = await import("@/views/ip/api");
        signal.throwIfAborted();
        return lookupIp(ip, signal);
      },
    },
    {
      name: "one_ip_ip_network",
      description:
        "Read ASN and BGP network topology information for a public IPv4 or IPv6 address from One IP's server.",
      inputSchema: {
        type: "object",
        properties: { ip: text("Public IPv4 or IPv6 address") },
        required: ["ip"],
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input, { signal }) => {
        const ip = ipAddress(input);
        signal.throwIfAborted();
        return endpoint(`/ip/network/${encodeURIComponent(ip)}`, { signal });
      },
    },
    {
      name: "one_ip_lookup_whois",
      description:
        "Read WHOIS or RDAP registration records for a domain, IP address, or ASN. Results come from external registries.",
      inputSchema: {
        type: "object",
        properties: {
          query: text("Domain, IP address, or ASN such as AS15169"),
        },
        required: ["query"],
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input, { signal }) => {
        const query = required(input, "query");
        const { lookupWhois } = await import("@/views/whois/api");
        signal.throwIfAborted();
        return lookupWhois(query, signal);
      },
    },
    {
      name: "one_ip_lookup_subdomains",
      description:
        "Look up subdomains of a public domain in certificate transparency records. Results are not a complete DNS inventory.",
      inputSchema: {
        type: "object",
        properties: {
          domain: text("Public domain, without a URL scheme or path"),
        },
        required: ["domain"],
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input, { signal }) => {
        const domain = required(input, "domain");
        signal.throwIfAborted();
        return endpoint(`/subdomains/${encodeURIComponent(domain)}`, {
          signal,
        });
      },
    },
    {
      name: "one_ip_run_ping",
      description:
        "Run a remote Globalping measurement against a public host. Sends the target to Globalping and may take several seconds. Select one to six continents and one to eight probes per continent.",
      inputSchema: {
        type: "object",
        properties: {
          host: text("Public domain or IP address, without a scheme or path"),
          protocol: { type: "string", enum: ["icmp", "https"] },
          regions: {
            type: "array",
            items: {
              type: "string",
              enum: ["AF", "AS", "EU", "NA", "OC", "SA"],
            },
            minItems: 1,
            maxItems: 6,
          },
          perRegion: { type: "integer", minimum: 1, maximum: 8 },
        },
        required: ["host"],
      },
      annotations: { consequentialHint: true },
      execute: async (input, { signal }) => {
        const host = required(input, "host");
        if (!/^[\da-zA-Z.:-]+$/.test(host))
          throw new Error("Enter a host without a URL scheme, path, or port");
        const protocol = input.protocol ?? "icmp";
        if (protocol !== "icmp" && protocol !== "https")
          throw new Error("Invalid protocol");
        const regions = input.regions ?? ["AS", "EU", "NA"];
        if (
          !Array.isArray(regions) ||
          !regions.length ||
          regions.length > 6 ||
          regions.some(
            (region) => !["AF", "AS", "EU", "NA", "OC", "SA"].includes(region),
          )
        )
          throw new Error("Invalid regions");
        const perRegion = input.perRegion ?? 2;
        if (
          !Number.isInteger(perRegion) ||
          Number(perRegion) < 1 ||
          Number(perRegion) > 8 ||
          new Set(regions).size * Number(perRegion) > 50
        )
          throw new Error("Invalid probe count");
        const { runPing } = await import("@/views/ping/api");
        signal.throwIfAborted();
        return runPing(
          { host, protocol, regions, perRegion: Number(perRegion) },
          signal,
        );
      },
    },
    {
      name: "one_ip_service_status",
      description:
        "Read the latest incident and component status for one service listed on One IP's status page.",
      inputSchema: {
        type: "object",
        properties: {
          service: text(
            "Service name or ID; call one_ip_catalog for available services",
          ),
        },
        required: ["service"],
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input, { signal }) => {
        const name = required(input, "service", 80);
        const service = services.find(
          (item) =>
            item.id === name || item.name.toLowerCase() === name.toLowerCase(),
        );
        if (!service) throw new Error(`Unknown service: ${name}`);
        const { getStatus } = await import("@/views/status/api");
        signal.throwIfAborted();
        return {
          service: service.name,
          ...(await getStatus(service.id, signal)),
        };
      },
    },
    {
      name: "one_ip_ai_network",
      description:
        "Check reachability and readable network exit for one supported AI platform. Browser access and login are not guaranteed.",
      inputSchema: {
        type: "object",
        properties: {
          platform: {
            type: "string",
            enum: aiPlatforms.map((item) => item.id),
          },
        },
        required: ["platform"],
      },
      annotations: { readOnlyHint: true },
      execute: async (input, { signal }) => {
        const id = required(input, "platform", 30);
        const platform = aiPlatforms.find((item) => item.id === id);
        if (!platform) throw new Error(`Unknown AI platform: ${id}`);
        const { probeAiDomain } = await import("@/views/ai/probe");
        signal.throwIfAborted();
        const [reachability, exit] = await Promise.all([
          probeAiDomain(platform.domain, signal),
          platform.traceDomain
            ? trace(platform.traceDomain, signal).catch(() => null)
            : null,
        ]);
        signal.throwIfAborted();
        return {
          platform: platform.name,
          reachability,
          exit,
          page: `/ai/${id}`,
        };
      },
    },
    {
      name: "one_ip_connectivity",
      description:
        "Measure this browser's reachability and median latency to one site from One IP's fixed target catalog. Makes up to eight browser requests.",
      inputSchema: {
        type: "object",
        properties: { site: text("Exact site name from one_ip_catalog") },
        required: ["site"],
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input, { signal }) => {
        const site = selected(
          connectivityTargets,
          required(input, "site", 80),
          "site",
        );
        const { testConnectivity } = await import("@/views/link/api");
        signal.throwIfAborted();
        return {
          site: site.name,
          ...(await testConnectivity(site.url, signal)),
        };
      },
    },
    {
      name: "one_ip_site_egress",
      description:
        "Check which IP exit a listed third-party website observes from this browser, when readable; also report reachability. The destination sees a browser request.",
      inputSchema: {
        type: "object",
        properties: { site: text("Exact site name from one_ip_catalog") },
        required: ["site"],
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input, { signal }) => {
        const site = selected(
          egressSites,
          required(input, "site", 80),
          "egress site",
        );
        const { inspectSite } = await import("@/views/home/api");
        signal.throwIfAborted();
        return { site: site.name, ...(await inspectSite(site, signal)) };
      },
    },
    {
      name: "one_ip_dns_exit",
      description:
        "Sample this browser's DNS resolver exits across One IP's fixed third-party sources. Makes 16 requests and returns observed resolvers.",
      inputSchema: empty,
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (_, { signal }) => {
        const { detectDnsExits } = await import("@/views/dns-exit/api");
        signal.throwIfAborted();
        return detectDnsExits(signal, () => {});
      },
    },
    {
      name: "one_ip_cdn_node",
      description:
        "Check which edge node of a supported CDN answers this browser, when response headers or trace are readable.",
      inputSchema: {
        type: "object",
        properties: { provider: text("Exact CDN name from one_ip_catalog") },
        required: ["provider"],
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input, { signal }) => {
        const provider = selected(
          providers,
          required(input, "provider", 80),
          "CDN provider",
        );
        const { checkCdnProvider } = await import("@/views/cdn/api");
        signal.throwIfAborted();
        return {
          provider: provider.name,
          ...(await checkCdnProvider(provider, signal)),
        };
      },
    },
    {
      name: "one_ip_browser_diagnostics",
      description:
        "Inspect this browser's environment, permissions, automation signals, consistency, fingerprint, TLS, WebRTC exits, or local deep diagnostics. Fingerprint and WebRTC results describe this browser and can be sensitive. Permission states are read without requesting access.",
      inputSchema: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: [
              "environment",
              "permissions",
              "automation",
              "consistency",
              "fingerprint",
              "tls",
              "webrtc",
              "deep",
            ],
          },
        },
        required: ["kind"],
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input, { signal }) => {
        const kind = required(input, "kind", 20);
        signal.throwIfAborted();
        if (kind === "environment") {
          const { environmentRows } =
            await import("@/views/browser/environment");
          return Object.fromEntries(environmentRows());
        }
        if (kind === "permissions") {
          const names = [
            "geolocation",
            "camera",
            "microphone",
            "notifications",
          ] as const;
          const states = await Promise.all(
            names.map(async (name) => {
              try {
                return [
                  name,
                  (
                    await navigator.permissions.query({
                      name: name as PermissionName,
                    })
                  ).state,
                ];
              } catch {
                return [name, "unavailable"];
              }
            }),
          );
          signal.throwIfAborted();
          return {
            secureContext: isSecureContext,
            permissions: Object.fromEntries(states),
          };
        }
        if (kind === "automation" || kind === "consistency") {
          const { automationChecks, consistencyChecks } =
            await import("@/views/browser/collect");
          signal.throwIfAborted();
          const result =
            kind === "automation"
              ? automationChecks()
              : await consistencyChecks();
          signal.throwIfAborted();
          return result;
        }
        if (kind === "fingerprint") {
          const { fingerprint } = await import("@/views/browser/collect");
          signal.throwIfAborted();
          const result = await fingerprint();
          signal.throwIfAborted();
          return {
            visitorId: result.visitorId,
            version: result.version,
            components: result.components.map(({ name, value }) => ({
              name,
              value,
            })),
          };
        }
        if (kind === "tls") {
          signal.throwIfAborted();
          return endpoint("/browser/tls-fingerprint", {
            signal,
            cache: "no-store",
          });
        }
        if (kind === "webrtc") {
          const { runWebRtc } = await import("@/views/webrtc/api");
          signal.throwIfAborted();
          return runWebRtc(undefined, signal);
        }
        if (kind === "deep") {
          const { collectDeepDiagnostics } =
            await import("@/views/browser/deep-diagnostics");
          signal.throwIfAborted();
          return collectDeepDiagnostics(signal);
        }
        throw new Error(`Unknown browser diagnostic: ${kind}`);
      },
    },
    {
      name: "one_ip_catalog",
      description:
        "List available One IP pages, service names, connectivity sites, CDN providers, and AI platforms before selecting a diagnostic tool.",
      inputSchema: empty,
      annotations: { readOnlyHint: true },
      execute: () => ({
        pages,
        services: services.map(({ id, name }) => ({ id, name })),
        connectivitySites: connectivityTargets.map(({ name }) => name),
        egressSites: egressSites.map(({ name }) => name),
        cdnProviders: providers.map(({ name }) => name),
        aiPlatforms: aiPlatforms.map(({ id, name }) => ({ id, name })),
      }),
    },
  ];
}
