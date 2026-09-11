import AiDiagnostics from "@/views/components/ai-diagnostics";
import { EnvironmentScore } from "./environment-score";

export default function ClaudePage() {
  return (
    <div className="flex flex-col gap-4">
      <AiDiagnostics kind="claude" />
      <EnvironmentScore />
    </div>
  );
}
