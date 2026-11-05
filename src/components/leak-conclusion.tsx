import type { ReactNode } from "react";
import { AnimatedValue } from "@/components/animated-value";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  CircleHelp,
  LoaderCircle,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

export type LeakConclusionLevel =
  "safe" | "leak" | "warning" | "unknown" | "pending";

const tone = {
  safe: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200",
  leak: "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
  unknown: "border-border bg-muted text-foreground",
  pending: "border-border bg-muted text-foreground",
} as const satisfies Record<LeakConclusionLevel, string>;

const icons = {
  safe: ShieldCheck,
  leak: ShieldAlert,
  warning: TriangleAlert,
  unknown: CircleHelp,
  pending: LoaderCircle,
} as const;

/** Prominent leak-test conclusion: one headline plus the reasoning. */
export function LeakConclusion({
  level,
  title,
  detail,
  provisional = false,
}: {
  level: LeakConclusionLevel;
  title: string;
  detail: ReactNode;
  provisional?: boolean;
}) {
  const Icon = icons[level];
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3.5",
        tone[level],
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-7 flex-none",
          level === "pending" && "animate-spin text-muted-foreground",
        )}
      />
      <div className="grid min-w-0 gap-1">
        <AnimatedValue value={`${level}${provisional}`}>
          <strong className="text-lg leading-tight font-semibold">
            {title}
            {provisional && (
              <span className="ml-2 text-xs font-normal opacity-75">
                {t("leak.provisional")}
              </span>
            )}
          </strong>
        </AnimatedValue>
        <div className="text-sm opacity-90">{detail}</div>
      </div>
    </div>
  );
}
