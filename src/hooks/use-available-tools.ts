import { toolGroups, visibleTools } from "@/layout/routes";
import { useChallengeConfig } from "./use-challenge-config";

export function useAvailableTools(group: keyof typeof toolGroups) {
  const { data } = useChallengeConfig(group === "browser");
  return visibleTools(
    group,
    data?.some((provider) => provider.configured) ?? false,
  );
}
