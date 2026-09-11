import type { BrowserNavigator } from "@/views/browser/environment";
import {
  CN_TIMEZONES,
  CN_BROWSER_PATTERNS,
  CN_DEVICE_PATTERNS,
  FONTS_SC,
  FONTS_TC,
  FONTS_CN_VENDOR,
} from "./device-patterns.ts";

export function matchEnvironment(
  userAgent: string,
  timezone: string,
  languages: readonly string[],
) {
  return {
    timezoneMatch: CN_TIMEZONES.includes(timezone),
    chineseLanguages: languages.filter((value) => /^zh(?:-|$)/i.test(value)),
    browsers: CN_BROWSER_PATTERNS.filter(([pattern]) =>
      pattern.test(userAgent),
    ).map(([, name]) => name),
    devices: CN_DEVICE_PATTERNS.filter(([pattern]) =>
      pattern.test(userAgent),
    ).map(([, name]) => name),
  };
}

export function probeFonts(
  ctx: Pick<CanvasRenderingContext2D, "font" | "measureText">,
  fonts: string[],
) {
  const sample = "字体辨识 AaMm0123456789";
  return fonts.filter((font) =>
    ["monospace", "serif", "sans-serif"].some((base) => {
      ctx.font = `72px ${base}`;
      const baseline = ctx.measureText(sample).width;
      ctx.font = `72px "${font}", ${base}`;
      return Math.abs(ctx.measureText(sample).width - baseline) > 0.5;
    }),
  );
}

export function pixelSummary(pixels: Uint8ClampedArray) {
  let visible = 0,
    colored = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 32) continue;
    visible++;
    if (
      Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) -
        Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) >
      20
    )
      colored++;
  }
  return {
    visible,
    colored,
    kind: !visible ? "empty" : colored > 0 ? "color" : "monochrome",
  } as const;
}

function renderEmoji(emoji: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 80;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.font =
    '48px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  ctx.fillText(emoji, 4, 55);
  return {
    emoji,
    ...pixelSummary(ctx.getImageData(0, 0, 128, 80).data),
  };
}

export async function collectDeviceSignals(signal: AbortSignal) {
  signal.throwIfAborted();
  const nav = navigator as BrowserNavigator;
  let model: string | undefined;
  if (nav.userAgentData?.getHighEntropyValues) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<undefined>((resolve) => {
      timer = setTimeout(() => resolve(undefined), 1000);
    });
    try {
      const high = await Promise.race([
        nav.userAgentData.getHighEntropyValues(["model"]),
        timeout,
      ]);
      if (typeof high?.model === "string") model = high.model;
    } catch {
      /* Restricted Client Hints remain unknown. */
    } finally {
      clearTimeout(timer);
    }
  }
  signal.throwIfAborted();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const languages = Array.from(
    nav.languages.length ? nav.languages : [nav.language],
  );
  const brandText =
    nav.userAgentData?.brands.map((item) => item.brand).join(" ") ?? "";
  let fonts:
    | { simplified: string[]; traditional: string[]; vendor: string[] }
    | undefined;
  let emojis: ReturnType<typeof renderEmoji>[] | undefined;
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    if (ctx)
      fonts = {
        simplified: probeFonts(ctx, FONTS_SC),
        traditional: probeFonts(ctx, FONTS_TC),
        vendor: probeFonts(ctx, FONTS_CN_VENDOR),
      };
  } catch {
    /* Canvas may be blocked. Do not report a clean result. */
  }
  try {
    emojis = ["🇨🇳", "🇹🇼", "🇺🇸", "😀"].map(renderEmoji);
  } catch {
    /* Canvas readback may be blocked. */
  }
  return {
    timezone,
    languages,
    model,
    fonts,
    emojis,
    offset: -new Date().getTimezoneOffset(),
    dateLocale: Intl.DateTimeFormat().resolvedOptions().locale,
    numberLocale: Intl.NumberFormat().resolvedOptions().locale,
    ...matchEnvironment(
      `${nav.userAgent} ${brandText} ${model ?? ""}`,
      timezone,
      languages,
    ),
  };
}
