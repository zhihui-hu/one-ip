import { memo } from "react";
import { dataTableRowClass } from "@/components/data-table";
import { pingDotClass } from "@/components/ping-dot";
import { Pending } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { TableRow, TableCell } from "@/components/ui/table";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  Info,
  BrainCircuit,
  ShoppingBag,
  MessagesSquare,
  Bitcoin,
  Play,
  Gamepad2,
  Briefcase,
  Code2,
  Cloud,
  Search,
  House,
  Mail,
} from "lucide-react";
import { ScenarioStars } from "./scenario-stars";
import {
  pingDotsClass,
  platformNameClass,
  platformNameLabelClass,
  tableCellClass,
} from "./styles";
import { scenarioGroups, type ScenarioGroup } from "../scenario-targets";

const scenarioIcons = {
  ai: BrainCircuit,
  commerce: ShoppingBag,
  social: MessagesSquare,
  crypto: Bitcoin,
  streaming: Play,
  gaming: Gamepad2,
  remote: Briefcase,
  api: Code2,
  hosting: Cloud,
  search: Search,
  domestic: House,
  communication: Mail,
};

export const platformCount = new Set(
  scenarioGroups.flatMap((group) => group.targets.map((target) => target.url)),
).size;

// Only visible rating/coverage changes rerender a row; raw sample updates stay in the dialog.
export const ScenarioSummaryRow = memo(function ScenarioSummaryRow({
  group,
  average,
  rated,
  dots,
  busy,
  onSelect,
}: {
  group: ScenarioGroup;
  average: number | null;
  rated: number;
  dots: string;
  busy: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = scenarioIcons[group.id as keyof typeof scenarioIcons];
  const states = dots.split(",");
  const partial = average !== null && rated < group.targets.length;
  return (
    <TableRow
      className={cn(dataTableRowClass, "h-10 cursor-pointer")}
      onClick={() => onSelect(group.id)}
    >
      <TableCell className={tableCellClass}>
        <button
          type="button"
          className={platformNameClass}
          aria-haspopup="dialog"
          onClick={(event) => {
            event.stopPropagation();
            onSelect(group.id);
          }}
        >
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className={platformNameLabelClass}>{group.label}</span>
        </button>
      </TableCell>
      <TableCell className={tableCellClass}>
        <div className="flex min-h-[22px] items-center gap-1.5 tabular-nums max-sm:relative max-sm:gap-1 max-sm:pr-3">
          <div
            className={pingDotsClass}
            aria-label={t("ip.scenarios.rated", [rated, group.targets.length])}
          >
            {group.targets.map((target, index) => (
              <span
                key={target.url}
                className={pingDotClass(
                  states[index] === "_"
                    ? undefined
                    : states[index] === "!"
                      ? "fail"
                      : "good",
                )}
                title={`${target.name} · ${states[index] === "_" ? t("common.checking") : states[index] === "!" ? t("ip.scenarios.insufficientEvidence") : `${states[index]}/5`}`}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground max-sm:hidden">
            {rated}/{group.targets.length}
          </span>
          <span
            className="invisible inline-flex h-[11px] w-[11px] flex-[0_0_11px] text-warn data-[visible=true]:visible max-sm:absolute max-sm:right-0"
            data-visible={partial}
            title={partial ? t("ip.scenarios.partialResults") : undefined}
            aria-label={partial ? t("ip.scenarios.partialResults") : undefined}
            aria-hidden={!partial}
          >
            <Info size={11} aria-hidden="true" />
          </span>
        </div>
      </TableCell>
      <TableCell className={tableCellClass}>
        <div className="flex min-h-[22px] items-center">
          {average !== null ? (
            <ScenarioStars stars={average} inTable />
          ) : (
            <Badge variant="secondary">
              {busy ? (
                <Pending>{t("common.checking")}</Pending>
              ) : (
                t("ip.scenarios.insufficientEvidence")
              )}
            </Badge>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
});
