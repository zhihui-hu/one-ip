import { useEffect, useRef, useState } from "react";
import { LazyMount } from "@/components/lazy-mount";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  StreamingAnswer,
  type AnswerPart as Part,
} from "@/components/ui/streaming-answer";
import { locale, t, type MessageKey } from "@/i18n";
import { countryName } from "@/lib/country";
import { sameIp } from "@/lib/ip-address";
import { fingerprint } from "@/views/browser/collect";
import type { BrowserNavigator } from "@/views/browser/environment";
import { lookupIp } from "@/views/ip/api";
import { useQuery } from "@tanstack/react-query";
import { getBrowserIp, getDomesticIp, getGeo, getOverseasIp } from "./api";

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

// By the visitor's own clock: 5–11 morning, 11–13 noon, 13–18 afternoon,
// 18–23 evening, otherwise late night.
function greetingOf(hour: number): MessageKey {
  if (hour >= 5 && hour < 11) return "home.portrait.morning";
  if (hour >= 11 && hour < 13) return "home.portrait.noon";
  if (hour >= 13 && hour < 18) return "home.portrait.afternoon";
  if (hour >= 18 && hour < 23) return "home.portrait.evening";
  return "home.portrait.lateNight";
}

type Company = {
  is_proxy?: boolean;
  is_vpn?: boolean;
  is_tor?: boolean;
  trust_score?: number;
};

// Same bands as the IP page: 90–100 high, 75–89 good, 45–74 fair, below that low.
function scoreComment(score: number): MessageKey {
  if (score >= 90) return "home.portrait.scoreHigh";
  if (score >= 75) return "home.portrait.scoreGood";
  if (score >= 45) return "home.portrait.scoreFair";
  return "home.portrait.scoreLow";
}

// A rough word on the machine, by logical cores (browsers may cap this).
function powerComment(cores: number): MessageKey {
  if (cores >= 12) return "home.portrait.powerHigh";
  if (cores >= 8) return "home.portrait.powerGood";
  if (cores >= 4) return "home.portrait.powerFair";
  return "home.portrait.powerLow";
}

// "中国电信" reads better than "Chinanet" in a Chinese letter.
function ispName(isp: string) {
  if (locale === "en") return isp;
  if (/china ?telecom|chinanet/i.test(isp)) return "中国电信";
  if (/china ?unicom|cnc ?group/i.test(isp)) return "中国联通";
  if (/china ?mobile|cmnet/i.test(isp)) return "中国移动";
  return isp;
}

// The letter as last written this session, so a return visit skips the typing.
const cacheKey = "ip-tools:portrait-letter";

function readCachedLetter(): Part[] | undefined {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(cacheKey) ?? "");
    return Array.isArray(value) ? (value as Part[]) : undefined;
  } catch {
    return undefined;
  }
}

function cacheLetter(parts: Part[]) {
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(parts));
  } catch {
    // Storage full or blocked: the next visit just types it out again.
  }
}

/** True once the element has scrolled properly into view; stays true after. */
function useSeen<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(
    () => typeof IntersectionObserver === "undefined",
  );
  useEffect(() => {
    const element = ref.current;
    if (seen || !element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      // Its top must clear the bottom fifth of the screen, not just peek in.
      { rootMargin: "0px 0px -20% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [seen]);
  return [ref, seen] as const;
}

function PortraitLetter() {
  const [cardRef, seen] = useSeen<HTMLDivElement>();
  // Read the clock once, so a re-render can't switch the greeting mid-letter.
  const [hour] = useState(() => new Date().getHours());
  const [cached] = useState(readCachedLetter);
  const external = useQuery({
    queryKey: ["browser-ip", 4],
    queryFn: ({ signal }) => getOverseasIp(signal),
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
    (!split || !domesticGeo.isPending) &&
    !visitor.isPending;

  const company = reputation.data?.coffee as Company | undefined;
  const where = ip ? { ip, ...external.data, ...geo.data } : undefined;
  const home = split
    ? { ip: domesticIp!, ...domestic.data, ...domesticGeo.data }
    : where;
  const unknown = t("common.unknown");
  const parts: Part[] = [];

  // A hello for the time of day, to wherever they really seem to be.
  const town =
    home?.city ?? countryName(home?.country_code) ?? home?.country ?? "";
  parts.push(
    t(greetingOf(hour)),
    ...(town
      ? fill("home.portrait.from", [town])
      : [t("home.portrait.greetEnd")]),
    "\n",
  );

  // The network: the browser, the exits sites see, and what the score says.
  const nav = navigator as BrowserNavigator;
  const browser = browserOf(nav.userAgent);
  if (where) {
    const proxied =
      split || company?.is_proxy || company?.is_vpn || company?.is_tor;
    const score = company?.trust_score;
    parts.push(
      ...fill(
        proxied ? "home.portrait.exitProxy" : "home.portrait.exitDirect",
        [browser, where.ip],
      ),
      ...(ip6 ? fill("home.portrait.ipv6", [ip6]) : []),
      ...(typeof score === "number"
        ? [...fill("home.portrait.score", [score]), t(scoreComment(score))]
        : [t("home.portrait.period")]),
    );
    if (split && home)
      parts.push(
        ...fill("home.portrait.domestic", [
          ispName(home.isp || unknown),
          home.ip,
        ]),
      );
    else if (domesticIp) parts.push(t("home.portrait.direct"));
  } else {
    parts.push(t("home.portrait.noIp"));
    if (ip6) parts.push(...fill("home.portrait.onlyIpv6", [ip6]));
  }
  parts.push("\n");

  // The machine, then its language and clock against where the IP is.
  const mobile = /Mobi|Android|iPhone|iPad/.test(nav.userAgent);
  const cores = nav.hardwareConcurrency;
  const gpu = gpuOf();
  parts.push(
    ...fill(mobile ? "home.portrait.phone" : "home.portrait.computer", [
      osOf(nav.userAgent, nav.userAgentData?.platform || nav.platform),
      cores ?? "?",
      `${screen.width} × ${screen.height}`,
    ]),
    ...(gpu ? fill("home.portrait.gpu", [gpu]) : []),
    t(cores ? powerComment(cores) : "home.portrait.period"),
  );
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

  // What it adds up to.
  if (visitor.data)
    parts.push(
      ...fill("home.portrait.fingerprint", [
        visitor.data.visitorId.slice(0, 12),
      ]),
    );
  parts.push(t("home.portrait.farewell"));

  return (
    <Card ref={cardRef} aria-label={t("home.portrait.title")}>
      <CardContent>
        {/* Data loads ahead of time; the typing waits until it can be watched.
            Seen before this session: show the last letter at once, then the
            fresh one in its place when it's ready, without typing either. */}
        {cached || (ready && seen) ? (
          <StreamingAnswer
            parts={ready ? parts : cached!}
            animate={!cached}
            onDone={() => ready && cacheLetter(parts)}
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
      rootMargin="300px 0px"
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
