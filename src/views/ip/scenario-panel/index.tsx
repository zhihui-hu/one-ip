import { useState } from "react";
import { dataTableClass, dataTableHeaderClass } from "@/components/data-table";
import { Pending, ToolCard } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { AccessRows } from "./access-rows";
import { EvidenceDetails } from "./evidence-details";
import { metricLabels, stateLabels, stateTone } from "./labels";
import { ScenarioStars } from "./scenario-stars";
import { tableClass, tableHeadClass } from "./styles";
import { ScenarioSummaryRow, platformCount } from "./summary-row";
import {
  accessRating,
  averageAccessRating,
  evidenceState,
  qualityRating,
} from "../scenario-evidence";
import { scenarioGroups, type ScenarioTarget } from "../scenario-targets";
import type { useIpLatency } from "../use-ip-latency";
import { useScenarioAccess } from "../use-scenario-access";
import { useScenarioEvidence } from "../use-scenario-evidence";

export function ScenarioPanel({
  ip,
  inbound,
}: {
  ip: string;
  inbound: ReturnType<typeof useIpLatency>;
}) {
  const { records, busy, now, run, cancel } = useScenarioEvidence(ip);
  const access = useScenarioAccess(ip);
  const [selected, setSelected] = useState<string | null>(null);
  const group = scenarioGroups.find((item) => item.id === selected);
  const summary = (targets: ScenarioTarget[]) =>
    averageAccessRating(
      targets.map((target) => access.records[target.url]),
      ip,
      now,
    );
  const average = group ? summary(group.targets) : null;
  const key = group?.inbound ? "https" : "quality";
  const evidence = records[key];
  const quality = group?.quality
    ? qualityRating(evidence, ip, group.quality, now)
    : null;
  const state = quality?.state ?? evidenceState(evidence, ip, now);
  const hasTurn = Boolean(
    import.meta.env.VITE_SPEEDTEST_TURN_URI &&
    import.meta.env.VITE_SPEEDTEST_TURN_CREDENTIALS_URL,
  );
  const manual = (
    <>
      <div className="my-2 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={Boolean(busy) || inbound.busy || access.busy}
          onClick={() => void run(key)}
        >
          {group?.inbound
            ? t("ip.scenarios.testInboundHttps")
            : t("ip.scenarios.startQualityTest")}
        </Button>
        {busy === key && (
          <Button size="sm" variant="ghost" onClick={cancel}>
            {t("ip.scenarios.cancel")}
          </Button>
        )}
        <Badge variant={stateTone(state)}>
          {state === "running" ? (
            <Pending>{stateLabels[state]}</Pending>
          ) : (
            stateLabels[state]
          )}
        </Badge>
      </div>
      {state === "mismatch" && (
        <p>
          {t("ip.scenarios.observedEgressDiffersQueriedIpResultCannotRate")}
        </p>
      )}
      {state === "unverifiable" && (
        <p>
          {t(
            "ip.scenarios.responseEgressCannotVerifiedDoesEstablishIpUnavailability",
          )}
        </p>
      )}
      {state === "expired" && (
        <p>{t("ip.scenarios.oldResultReferenceRunNewTest")}</p>
      )}
      {!!quality?.missing.length && (
        <p>
          {t("ip.scenarios.missingValidEvidence")}：
          {quality.missing.map((name) => metricLabels[name] ?? name).join("、")}
        </p>
      )}
      {evidence && <EvidenceDetails evidence={evidence} />}
      {quality?.stars != null && (
        <>
          <ScenarioStars stars={quality.stars} />
          <p>{t("ip.scenarios.fiveAimClassesMap15StarsBrowser")}</p>
        </>
      )}
    </>
  );
  return (
    <ToolCard title={t("ip.scenarios.applicationAccessRatings")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          {t(
            "ip.scenarios.automaticallyTestsScenariosAcrossPlatformsSelectScenarioDetails",
            [scenarioGroups.length, platformCount],
          )}
        </p>
        <Button
          size="sm"
          variant="secondary"
          disabled={Boolean(busy)}
          onClick={access.busy ? access.cancel : access.start}
        >
          {access.busy ? (
            <Pending>{t("common.stopTesting")}</Pending>
          ) : (
            t("common.testAgain")
          )}
        </Button>
      </div>
      <div className={cn(dataTableClass, "rounded-none bg-transparent")}>
        <Table className={tableClass}>
          <TableHeader className={dataTableHeaderClass}>
            <TableRow className="border-0 border-current">
              <TableHead className={`w-[42%] ${tableHeadClass}`}>
                {t("ip.scenarios.scenario")}
              </TableHead>
              <TableHead className={`w-[25%] max-sm:w-[23%] ${tableHeadClass}`}>
                {t("ip.scenarios.coverage")}
              </TableHead>
              <TableHead className={`w-[33%] max-sm:w-[35%] ${tableHeadClass}`}>
                {t("ip.scenarios.averageRating")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scenarioGroups.map((item) => {
              const result = summary(item.targets);
              const dots = item.targets
                .map((target) => {
                  const record = access.records[target.url];
                  const rating = accessRating(record, ip, now);
                  return rating.stars !== null
                    ? String(rating.stars)
                    : !record || record.state === "running"
                      ? "_"
                      : "!";
                })
                .join(",");
              return (
                <ScenarioSummaryRow
                  key={item.id}
                  group={item}
                  average={result.average}
                  rated={result.rated}
                  dots={dots}
                  busy={access.busy}
                  onSelect={setSelected}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>
      <ResponsiveDialog
        open={!!group}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={group?.label ?? t("ip.scenarios.applicationAccessRatings")}
        description={t(
          "ip.scenarios.accessRatingsCurrentNetworkSelectPlatformInspectSamples",
        )}
      >
        {group && average && (
          <div className="space-y-3 text-xs wrap-anywhere">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{t("ip.scenarios.averageAccessRating")}</span>
              {average.average !== null ? (
                <ScenarioStars stars={average.average} />
              ) : (
                <Badge variant="secondary">
                  {t("ip.scenarios.insufficientEvidence")}
                </Badge>
              )}
              <p className="w-full text-muted-foreground">
                {t(
                  "ip.scenarios.ratedAtLeastValidPlatformRatingsRequiredUnrated",
                  [average.rated, average.total, average.required],
                )}
              </p>
              {average.rated < average.total && (
                <Badge variant="warning">
                  {access.busy ? (
                    <Pending>{t("common.checking")}</Pending>
                  ) : (
                    t("ip.scenarios.partialResults")
                  )}
                </Badge>
              )}
            </div>
            <AccessRows
              key={group.id}
              targets={group.targets}
              records={access.records}
              ip={ip}
              now={now}
            />
            {group.quality && (
              <details>
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  {t("ip.scenarios.fullNetworkQualityTest")}
                </summary>
                <p>
                  {t(
                    "ip.scenarios.websiteAccessRatingsDoMeasureGameplayCallsPlayback",
                  )}
                </p>
                <p>
                  {t(
                    "ip.scenarios.measuresBrowserCloudflareConfiguredTurnServiceRoutesEvery",
                  )}
                </p>
                <p>{t("ip.scenarios.upAbout70Mb2MinutesThreePerformance")}</p>
                {!hasTurn && (
                  <p>
                    {t(
                      "ip.scenarios.turnLossTestingConfiguredBandwidthLatencyMeasuredBut",
                    )}
                  </p>
                )}
                {manual}
              </details>
            )}
            {group.inbound && (
              <details>
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  {t("ip.scenarios.inboundTestsForTheQueriedIp")}
                </summary>
                <p>
                  {t(
                    "ip.scenarios.ratingAboveDescribesAccessCloudWebsitesHostingCapability",
                  )}
                </p>
                <p>
                  {t("ip.scenarios.remoteProbesCheckIpHttps443BrowserEgress")}
                </p>
                <div className="my-2 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={inbound.busy || Boolean(busy) || access.busy}
                    onClick={() => void inbound.start()}
                  >
                    {t("ip.scenarios.testInboundIcmp")}
                  </Button>
                  {inbound.busy && (
                    <Button size="sm" variant="ghost" onClick={inbound.cancel}>
                      {t("ip.scenarios.cancel")}
                    </Button>
                  )}
                </div>
                {inbound.data && (
                  <p>
                    {t(
                      "ip.scenarios.icmpReturnedProbesReplyDoesEstablishHttpsFailure",
                      [inbound.data.results.length],
                    )}
                  </p>
                )}
                {inbound.error && (
                  <p className="text-destructive">{inbound.error}</p>
                )}
                {manual}
              </details>
            )}
            <p className="text-muted-foreground">
              {t(
                "ip.scenarios.testsPublicEndpointsOpaqueResponsesHideHttpStatus",
              )}
            </p>
          </div>
        )}
      </ResponsiveDialog>
      <details className="mt-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer">
          {t("ip.scenarios.ratingRulesAndTestScope")}
        </summary>
        <p className="mt-2">
          {t("ip.scenarios.eachPlatformNeeds3ValidResponsesScenarioNeeds")}
        </p>
        <p>{t("ip.scenarios.medianHttpResponseTimes1503006001000")}</p>
        <p>{t("ip.scenarios.initialSamplesComeFirstFollowedUp8Samples")}</p>
        <p>
          {t("ip.scenarios.testsPublicEndpointsOpaqueResponsesHideHttpStatus")}
        </p>
      </details>
    </ToolCard>
  );
}
