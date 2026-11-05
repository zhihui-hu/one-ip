import { t } from "@/i18n";
import { Star } from "lucide-react";

const ratingClass =
  "data-[rating=1]:[--scenario-rating-color:#dc2626] data-[rating=2]:[--scenario-rating-color:#ea580c] data-[rating=3]:[--scenario-rating-color:#2563eb] data-[rating=4]:[--scenario-rating-color:#16a34a] data-[rating=5]:[--scenario-rating-color:#b8860b] dark:data-[rating=1]:[--scenario-rating-color:#f87171] dark:data-[rating=2]:[--scenario-rating-color:#fb923c] dark:data-[rating=3]:[--scenario-rating-color:#60a5fa] dark:data-[rating=4]:[--scenario-rating-color:#4ade80] dark:data-[rating=5]:[--scenario-rating-color:#e6c16b]";

export function ScenarioStars({
  stars,
  showValue = true,
  inTable = false,
}: {
  stars: number;
  showValue?: boolean;
  /** Compact sizing used inside the scenario summary table. */
  inTable?: boolean;
}) {
  const starSize = inTable ? "size-[11px] max-sm:size-[9px]" : "size-[11px]";
  return (
    <span
      className={`flex flex-none items-center gap-0.5 text-subtle ${ratingClass}${inTable ? " max-sm:gap-px" : ""}`}
      data-rating={Math.floor(stars)}
      aria-label={t("ip.scenarios.rating5", [stars])}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          className={`relative flex-none ${starSize}`}
          aria-hidden="true"
        >
          <Star size={12} className={starSize} />
          <span
            className={`absolute top-0 left-0 h-[11px] overflow-hidden${inTable ? " max-sm:h-[9px]" : ""}`}
            style={{
              width: `${Math.min(1, Math.max(0, stars - index)) * 100}%`,
            }}
          >
            <Star
              size={12}
              className={`max-w-none fill-current text-(--scenario-rating-color) ${starSize}`}
            />
          </span>
        </span>
      ))}
      {showValue && (
        <span
          className={`ml-[3px] flex-none text-[10px] whitespace-nowrap text-muted-foreground${inTable ? " min-w-[4.5ch] tabular-nums max-sm:hidden" : ""}`}
        >
          {stars}/5
        </span>
      )}
    </span>
  );
}
