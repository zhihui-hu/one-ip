// Match the browser panel's one-second SweepShine cycle, including paint time.
export async function withDetectionAnimation<T>(
  detect: () => Promise<T>,
): Promise<T> {
  const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : 1100;
  const [result] = await Promise.allSettled([
    Promise.resolve().then(detect),
    new Promise((resolve) => setTimeout(resolve, delay)),
  ]);
  if (result.status === "rejected") throw result.reason;
  return result.value;
}
