import { useState } from "react";
import { t } from "@/i18n";
import { countryCode } from "@/lib/country";
import { cn } from "@/lib/utils";
import { Globe2 } from "lucide-react";

const sizes = {
  sm: { className: "h-3.5 w-[18px] rounded-[2px] align-[-2px]", width: 40 },
  lg: { className: "h-6 w-8 rounded-[3px] align-middle", width: 80 },
  xl: { className: "h-9 w-12 rounded-[4px] align-middle", width: 160 },
} as const;

/** Lazily loaded flag with a shimmer placeholder and a globe fallback. */
export function CountryFlag({
  code,
  size = "sm",
}: {
  code?: string;
  size?: keyof typeof sizes;
}) {
  const country = countryCode(code);
  const { className, width } = sizes[size];
  const src = country
    ? `https://flagcdn.com/w${width}/${country}.png`
    : undefined;
  const [status, setStatus] = useState<{
    src?: string;
    state: "loaded" | "error";
  }>({ state: "loaded" });
  const state = !src
    ? "fallback"
    : status.src !== src
      ? "loading"
      : status.state === "error"
        ? "fallback"
        : "loaded";
  return (
    <span
      role="img"
      aria-label={country?.toUpperCase() ?? t("common.unknownRegion")}
      className={cn(
        "group/flag relative inline-flex shrink-0 items-center justify-center overflow-hidden",
        "data-[state=loading]:animate-[flag-shimmer_1.2s_ease-in-out_infinite] data-[state=loading]:bg-[linear-gradient(100deg,color-mix(in_srgb,var(--muted)_90%,transparent)_30%,color-mix(in_srgb,var(--foreground)_6%,var(--muted))_50%,color-mix(in_srgb,var(--muted)_90%,transparent)_70%)] data-[state=loading]:bg-size-[300%_100%] motion-reduce:data-[state=loading]:animate-none",
        className,
      )}
      data-state={state}
    >
      {state === "fallback" ? (
        <Globe2
          aria-hidden="true"
          className="size-[72%] text-muted-foreground"
        />
      ) : (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-contain opacity-100 transition-[opacity,transform] duration-280 ease-[ease] transform-[scale(1)] group-data-[state=loading]/flag:opacity-0 group-data-[state=loading]/flag:transform-[scale(0.92)] motion-reduce:transition-none"
          referrerPolicy="no-referrer"
          onLoad={() => setStatus({ src, state: "loaded" })}
          onError={() => setStatus({ src, state: "error" })}
        />
      )}
    </span>
  );
}
