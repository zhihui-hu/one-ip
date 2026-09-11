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

export function summarizeSignals(outcomes: (DetectOutcome | undefined)[]) {
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
  };
}
