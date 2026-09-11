import type { ChallengeProvider } from "@/hooks/use-challenge-config";
import { endpoint } from "@/lib/network";

export function verifyChallenge({
  provider,
  token,
  signal,
}: {
  provider: ChallengeProvider["id"];
  token: string;
  signal: AbortSignal;
}) {
  return endpoint<{ success: boolean; message: string; score?: number }>(
    "/browser/challenges/verify",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, token }),
      signal,
    },
  );
}
