import { Fragment, useState } from "react";
import {
  dataTableClass,
  dataTableHeaderClass,
  dataTableRowClass,
} from "@/components/data-table";
import { LatencyBadge } from "@/components/latency-badge";
import { latencyTone, pingDotClass } from "@/components/ping-dot";
import { SiteLogo, siteCellIconClass } from "@/components/site-logo";
import { Pending } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { EvidenceDetails } from "./evidence-details";
import { ScenarioStars } from "./scenario-stars";
import {
  pingDotsClass,
  platformNameClass,
  platformNameLabelClass,
  tableCellClass,
  tableClass,
  tableHeadClass,
} from "./styles";
import { accessRating, type Evidence } from "../scenario-evidence";
import { type ScenarioTarget } from "../scenario-targets";

export function AccessRows({
  targets,
  records,
  ip,
  now,
}: {
  targets: ScenarioTarget[];
  records: Record<string, Evidence>;
  ip: string;
  now: number;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className={dataTableClass}>
      <Table className={tableClass}>
        <TableHeader className={dataTableHeaderClass}>
          <TableRow className="border-0 border-current">
            <TableHead className={`w-[40%] ${tableHeadClass}`}>
              {t("common.website")}
            </TableHead>
            <TableHead className={`w-[30%] ${tableHeadClass}`}>
              {t("common.testHistory")}
            </TableHead>
            <TableHead className={`w-[30%] ${tableHeadClass}`}>
              {t("common.latency")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {targets.map((target, index) => {
            const evidence = records[target.url];
            const rating = accessRating(evidence, ip, now);
            const running = !evidence || evidence.state === "running";
            const status = rating.stale
              ? t("ip.scenarios.expired")
              : evidence?.state === "cancelled"
                ? t("common.cancelled")
                : evidence?.state === "rate-limited"
                  ? t("ip.scenarios.rateLimited")
                  : evidence?.state === "failed"
                    ? t("ip.scenarios.requestRefused")
                    : rating.responses
                      ? rating.fluctuating
                        ? t("ip.scenarios.inconsistentResponses")
                        : t("ip.scenarios.responseReceived")
                      : running
                        ? t("common.checking")
                        : evidence?.samples.some(
                              (sample) => sample.error === "network",
                            )
                          ? t("ip.scenarios.probeBlocked")
                          : t("ip.scenarios.probeTimedOut");
            const open = expanded === target.url;
            const toggle = () => setExpanded(open ? null : target.url);
            return (
              <Fragment key={target.url}>
                <TableRow
                  data-alt={index % 2}
                  className={cn(
                    dataTableRowClass,
                    "cursor-pointer",
                    index % 2 ? "!bg-muted" : "!bg-transparent",
                  )}
                  onClick={toggle}
                >
                  <TableCell className={tableCellClass}>
                    <button
                      type="button"
                      className={platformNameClass}
                      aria-expanded={open}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggle();
                      }}
                    >
                      <SiteLogo
                        src={target.icon}
                        website={target.website ?? target.url}
                        className={siteCellIconClass}
                      />
                      <span className={platformNameLabelClass}>
                        {target.name}
                      </span>
                    </button>
                  </TableCell>
                  <TableCell className={tableCellClass}>
                    <div
                      className={pingDotsClass}
                      aria-label={t("ip.scenarios.responses", [
                        rating.responses,
                        rating.total,
                      ])}
                    >
                      {Array.from({ length: 8 }, (_, sampleIndex) => {
                        const sample = evidence?.samples[sampleIndex];
                        const good =
                          sample &&
                          ["readable", "opaque"].includes(sample.outcome);
                        return (
                          <span
                            key={sampleIndex}
                            className={pingDotClass(
                              !sample
                                ? undefined
                                : !good
                                  ? "fail"
                                  : latencyTone(sample.elapsedMs),
                            )}
                            title={
                              !sample
                                ? t("ip.scenarios.notSampled")
                                : good
                                  ? `${sample.elapsedMs} ms · ${sample.status ? `HTTP ${sample.status}` : t("ip.scenarios.opaqueResponse")}`
                                  : sample.status
                                    ? `HTTP ${sample.status}`
                                    : t("ip.scenarios.probeBlocked")
                            }
                          />
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className={tableCellClass}>
                    {rating.median !== null &&
                    !rating.stale &&
                    !["failed", "rate-limited", "cancelled"].includes(
                      evidence?.state ?? "",
                    ) ? (
                      <LatencyBadge
                        result={{
                          median: rating.median,
                          samples: evidence!.samples.map((sample) =>
                            ["opaque", "readable"].includes(sample.outcome)
                              ? sample.elapsedMs
                              : -1,
                          ),
                        }}
                        running={running}
                        className="min-w-16 tabular-nums max-md:min-w-0"
                      />
                    ) : (
                      <Badge variant={running ? "secondary" : "warning"}>
                        {running ? <Pending>{status}</Pending> : status}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
                {open && (
                  <TableRow className={dataTableRowClass}>
                    <TableCell
                      colSpan={3}
                      className={`whitespace-normal wrap-anywhere [&_p]:mt-1 ${tableCellClass}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span>
                          {rating.scope === "ip"
                            ? t("ip.scenarios.verifiedIpEgress")
                            : rating.scope === "different"
                              ? t("ip.scenarios.differentEgress")
                              : t("ip.scenarios.currentNetwork")}
                        </span>
                        <span>{status}</span>
                        {rating.stars !== null && (
                          <ScenarioStars stars={rating.stars} />
                        )}
                      </div>
                      {rating.scope === "different" && (
                        <p>
                          {t(
                            "ip.scenarios.egressDiffersQueriedIpStarsDescribeAccessCurrent",
                          )}
                        </p>
                      )}
                      {evidence && <EvidenceDetails evidence={evidence} />}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
