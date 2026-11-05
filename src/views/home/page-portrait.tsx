import { LazyMount } from "@/components/lazy-mount";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  StreamingAnswer,
  type AnswerPart as Part,
} from "@/components/ui/streaming-answer";
import { useTheme } from "@/hooks/use-theme";
import { locale, t, type MessageKey } from "@/i18n";
import { countryName } from "@/lib/country";
import { sameIp } from "@/lib/ip-address";
import type { Geo } from "@/lib/types";
import { fingerprint } from "@/views/browser/collect";
import type { BrowserNavigator } from "@/views/browser/environment";
import { lookupIp } from "@/views/ip/api";
import { useQuery } from "@tanstack/react-query";
import { getBrowserIp, getDomesticIp, getGeo } from "./api";

/** Splits a message on its {n} placeholders, so the values can be highlighted. */
function fill(key: MessageKey, values: (string | number)[]): Part[] {
  const template = t(key);
  const parts: Part[] = [];
  let last = 0;
  for (const match of template.matchAll(/\{(\d+)\}/g)) {
    if (match.index > last) parts.push(template.slice(last, match.index));
    parts.push({ text: String(values[Number(match[1])] ?? ""), strong: true });
    last = match.index + match[0].length;
  }
  if (last < template.length) parts.push(template.slice(last));
  return parts;
}

// Said the way a person would: "美国 Los Angeles", "Los Angeles, United States".
function placeOf(geo: Geo) {
  const country = countryName(geo.country_code) ?? geo.country;
  const town = geo.city ?? geo.region;
  if (locale === "en") return [town, country].filter(Boolean).join(", ");
  return [country, town].filter(Boolean).join(" ");
}

// "新加坡时间", "Pacific Time": friendlier than "Asia/Singapore".
function zoneName(timeZone: string) {
  try {
    return (
      new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: "longGeneric" })
        .formatToParts(new Date())
        .find((part) => part.type === "timeZoneName")?.value ?? timeZone
    );
  } catch {
    return timeZone;
  }
}

// Minutes east of UTC for a zone, now; two zones agree when their clocks do.
function offsetOf(timeZone: string) {
  try {
    const name = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value;
    if (name === "GMT") return 0;
    const match = name?.match(/GMT([+-])(\d{2}):?(\d{2})?/);
    if (!match) return undefined;
    return (
      (match[1] === "-" ? -1 : 1) *
      (Number(match[2]) * 60 + Number(match[3] ?? 0))
    );
  } catch {
    return undefined;
  }
}

function osOf(ua: string, platform?: string) {
  const ios = ua.match(/(?:iPhone|iPad|iPod).*? OS (\d+)/);
  if (ios) return `iOS ${ios[1]}`;
  const android = ua.match(/Android (\d+)/);
  if (android) return `Android ${android[1]}`;
  if (/Windows NT/.test(ua)) return "Windows";
  if (/CrOS/.test(ua)) return "ChromeOS";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return platform || t("home.portrait.unknownSystem");
}

function browserOf(ua: string) {
  for (const [name, pattern] of [
    ["Edge", /Edg(?:A|iOS)?\/(\d+)/],
    ["Opera", /OPR\/(\d+)/],
    ["Firefox", /(?:Firefox|FxiOS)\/(\d+)/],
    ["Chrome", /(?:Chrome|CriOS)\/(\d+)/],
    ["Safari", /Version\/(\d+).*Safari/],
  ] as const) {
    const match = ua.match(pattern);
    if (match) return `${name} ${match[1]}`;
  }
  return t("home.portrait.unknownBrowser");
}

function gpuOf() {
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    const raw = info && gl?.getParameter(info.UNMASKED_RENDERER_WEBGL);
    if (typeof raw !== "string" || !raw) return undefined;
    // "ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)"
    const angle = raw.match(/^ANGLE \([^,]+,\s*(.+?)(?:,[^,]*)?\)$/);
    return (angle?.[1] ?? raw)
      .replace(/^ANGLE Metal Renderer:\s*/, "")
      .replace(/\s*(?:Direct3D|vs_|ps_|\(0x).*$/, "")
      .trim();
  } catch {
    return undefined;
  }
}

function languageName(tag: string) {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(tag) ?? tag;
  } catch {
    return tag;
  }
}

type Company = {
  is_proxy?: boolean;
  is_vpn?: boolean;
  is_tor?: boolean;
  is_datacenter?: boolean;
  is_mobile?: boolean;
  isResidential?: boolean;
  trust_score?: number;
};

function typeOf(company?: Company) {
  if (!company) return undefined;
  if (company.is_proxy || company.is_vpn || company.is_tor)
    return t("home.portrait.typeProxy");
  if (company.is_datacenter) return t("home.portrait.typeDatacenter");
  if (company.is_mobile) return t("home.portrait.typeMobile");
  if (company.isResidential) return t("home.portrait.typeResidential");
  return undefined;
}

function PortraitLetter() {
  const { resolvedTheme } = useTheme();
  const external = useQuery({
    queryKey: ["browser-ip", 4],
    queryFn: ({ signal }) => getBrowserIp(4, signal),
    retry: false,
    staleTime: 60_000,
  });
  const external6 = useQuery({
    queryKey: ["browser-ip", 6],
    queryFn: ({ signal }) => getBrowserIp(6, signal),
    retry: false,
    staleTime: 60_000,
  });
  const domestic = useQuery({
    queryKey: ["home-domestic-ip", 3],
    queryFn: ({ signal }) => getDomesticIp(signal),
    retry: false,
    staleTime: 60_000,
  });
  const ip = external.data?.ip;
  const ip6 = external6.data?.ip;
  const domesticIp = domestic.data?.ip;
  const geoQuery = (address?: string) => ({
    queryKey: ["geoip", address],
    queryFn: ({ signal }: { signal: AbortSignal }) => getGeo(address!, signal),
    enabled: Boolean(address),
    retry: false,
    staleTime: 60_000,
  });
  const geo = useQuery(geoQuery(ip));
  const geo6 = useQuery(geoQuery(ip6));
  const domesticGeo = useQuery(geoQuery(domesticIp));
  const reputation = useQuery({
    queryKey: ["lookup-ip-coffee", ip],
    queryFn: ({ signal }) =>
      lookupIp(ip!, AbortSignal.any([signal, AbortSignal.timeout(3000)])),
    enabled: Boolean(ip),
    retry: false,
    staleTime: 3600_000,
    refetchOnWindowFocus: false,
  });
  const visitor = useQuery({
    queryKey: ["home-browser-fingerprint"],
    queryFn: () => fingerprint(),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const split = Boolean(domesticIp && ip && !sameIp(domesticIp, ip));
  // Write once everything has settled, so the letter isn't rewritten midway.
  const ready =
    !external.isPending &&
    !external6.isPending &&
    !domestic.isPending &&
    (!ip || (!geo.isPending && !reputation.isPending)) &&
    (!ip6 || !geo6.isPending) &&
    (!split || !domesticGeo.isPending) &&
    !visitor.isPending;

  const company = reputation.data?.coffee as Company | undefined;
  const where = ip ? { ip, ...external.data, ...geo.data } : undefined;
  const home = split
    ? { ip: domesticIp!, ...domestic.data, ...domesticGeo.data }
    : where;
  const nav = navigator as BrowserNavigator;
  const unknown = t("common.unknown");
  const parts: Part[] = [];

  // The network: the exit sites see, what kind of address it is, the other routes.
  const town =
    home?.city ?? countryName(home?.country_code) ?? home?.country ?? "";
  if (where) {
    const type = typeOf(company);
    const score = company?.trust_score;
    const isp = where.isp || unknown;
    parts.push(
      ...fill(split ? "home.portrait.overseasIp" : "home.portrait.yourIp", [
        where.ip,
        placeOf(where) || unknown,
      ]),
      ...(type
        ? fill("home.portrait.ownedBy", [isp, type])
        : fill("home.portrait.runBy", [isp])),
      ...(typeof score === "number"
        ? fill("home.portrait.score", [score])
        : []),
      t("home.portrait.period"),
    );
    if (split && home)
      parts.push(
        ...fill("home.portrait.domesticExit", [
          placeOf(home) || unknown,
          home.isp || unknown,
          home.ip,
          town || placeOf(home) || unknown,
        ]),
      );
    else if (domesticIp) parts.push(t("home.portrait.direct"));
  } else parts.push(t("home.portrait.noIp"));
  if (ip6) {
    const v6 = { ip: ip6, ...geo6.data };
    const near =
      where &&
      v6.country_code === where.country_code &&
      (v6.city ?? "") === (where.city ?? "");
    parts.push(
      ...(near
        ? fill("home.portrait.ipv6Near", [ip6])
        : fill("home.portrait.ipv6Far", [ip6, placeOf(v6) || unknown])),
    );
  }
  parts.push("\n");

  // Language and clock, against where the IP is.
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  parts.push(
    ...fill("home.portrait.language", [
      languageName(nav.language),
      zoneName(timeZone),
    ]),
  );
  const ipZone = geo.data?.timezone;
  const a = offsetOf(timeZone);
  const b = ipZone ? offsetOf(ipZone) : undefined;
  if (ipZone && a != null && b != null)
    parts.push(
      ...(a === b
        ? [t("home.portrait.timezoneMatch")]
        : fill("home.portrait.timezoneMismatch", [
            zoneName(ipZone),
            Math.round((Math.abs(a - b) / 60) * 10) / 10,
          ])),
    );
  parts.push("\n");

  // The device, and how they like it to look.
  const mobile = /Mobi|Android|iPhone|iPad/.test(nav.userAgent);
  const gpu = gpuOf();
  parts.push(
    ...fill(mobile ? "home.portrait.phone" : "home.portrait.computer", [
      osOf(nav.userAgent, nav.userAgentData?.platform || nav.platform),
      browserOf(nav.userAgent),
      `${screen.width} × ${screen.height}`,
      nav.hardwareConcurrency ?? "?",
    ]),
    ...(gpu ? fill("home.portrait.gpu", [gpu]) : [t("home.portrait.period")]),
    t(resolvedTheme === "dark" ? "home.portrait.dark" : "home.portrait.light"),
    "\n",
  );

  // What it adds up to.
  if (visitor.data)
    parts.push(
      ...fill("home.portrait.fingerprint", [
        visitor.data.visitorId.slice(0, 12),
      ]),
    );
  parts.push(t("home.portrait.farewell"));

  return (
    <Card aria-label={t("home.portrait.title")}>
      <CardContent>
        {ready ? (
          <StreamingAnswer
            parts={parts}
            speed={locale === "en" ? 200 : 80}
            className="text-[14px] leading-7 text-muted-foreground"
            after={
              <p className="text-right text-[13px] text-muted-foreground italic">
                {t("home.portrait.signature")}
              </p>
            }
          />
        ) : (
          <PortraitSkeleton />
        )}
      </CardContent>
    </Card>
  );
}

function PortraitSkeleton() {
  return (
    <div className="space-y-2.5" aria-busy="true">
      {[100, 94, 72, 100, 86, 58].map((width, index) => (
        <Skeleton key={index} className="h-4" style={{ width: `${width}%` }} />
      ))}
    </div>
  );
}

/** What the page can tell about the visitor, streamed in like a reply. */
export function PagePortrait() {
  return (
    <LazyMount
      className="mb-3"
      threshold={0.2}
      fallback={
        <Card aria-label={t("home.portrait.title")}>
          <CardContent>
            <PortraitSkeleton />
          </CardContent>
        </Card>
      }
    >
      <PortraitLetter />
    </LazyMount>
  );
}
