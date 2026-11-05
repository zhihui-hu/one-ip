import { cn } from "@/lib/utils";

/** One latency sample dot; `tone` follows the latency thresholds. */
export type PingDotTone = "good" | "warn" | "slow" | "fail";
const pingDotBaseClass =
  "size-[5px] shrink-0 rounded-full max-xs:size-1 transition-[background-color,transform] duration-220 ease-[ease] motion-reduce:transition-none";
const pingDotToneClass: Record<PingDotTone, string> = {
  good: "bg-ok",
  warn: "bg-good",
  slow: "bg-warn",
  fail: "bg-danger",
};
/** Legend swatch / dot colour for a tone. */
export const pingToneBgClass = pingDotToneClass;
export function pingDotClass(tone?: PingDotTone, className?: string) {
  return cn(
    pingDotBaseClass,
    tone
      ? `${pingDotToneClass[tone]} transform-[scale(1)]`
      : "bg-border transform-[scale(0.8)]",
    className,
  );
}
export function latencyTone(ms: number): PingDotTone {
  return ms < 0 ? "fail" : ms < 100 ? "good" : ms < 400 ? "warn" : "slow";
}
