import {
  SIGNALS,
  riskBand,
  type DetectOutcome,
  type SignalDef,
} from "../../../vendor/claude-environment/signals";

export async function detectSignal(
  definition: SignalDef,
): Promise<DetectOutcome> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(() => definition.detect()),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Detection timed out")),
          4000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Exit regions where Claude is not offered: the IP decides before any browser signal. */
export const BLOCKED_EXIT_REGIONS = ["CN", "HK", "MO"];

export function isBlockedExit(country?: string) {
  return BLOCKED_EXIT_REGIONS.includes(country?.toUpperCase() ?? "");
}

export function summarizeSignals(
  outcomes: (DetectOutcome | undefined)[],
  exitCountry?: string,
) {
  if (isBlockedExit(exitCountry))
    return { total: 100, band: riskBand(100), complete: true, blocked: true };
  const total = Math.round(
    SIGNALS.reduce(
      (sum, definition, i) =>
        sum + (outcomes[i]?.score ?? 0) * definition.weight,
      0,
    ),
  );
  return {
    total,
    band: riskBand(total),
    complete:
      outcomes.length === SIGNALS.length &&
      outcomes.every(
        (outcome) => outcome && !/unknown|unavailable/i.test(outcome.raw),
      ),
    blocked: false,
  };
}
