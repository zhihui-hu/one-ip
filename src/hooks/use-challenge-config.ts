import { endpoint } from "@/lib/network";
import { useQuery } from "@tanstack/react-query";

export type ChallengeProvider = {
  id: "turnstile" | "turnstile-noninteractive" | "recaptcha";
  name: string;
  configured: boolean;
  reason?: string;
  sitekey?: string;
};

export function useChallengeConfig(enabled = true) {
  return useQuery({
    queryKey: ["challenge-config"],
    queryFn: ({ signal }) =>
      endpoint<ChallengeProvider[]>("/browser/challenges", { signal }),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}
