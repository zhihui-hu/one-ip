import { t } from "@/i18n";
import { metricLabels } from "./labels";
import { type Evidence } from "../scenario-evidence";

const noteClass = "text-[11px] leading-[1.6] text-muted-foreground";

export function EvidenceDetails({ evidence }: { evidence: Evidence }) {
  const readable = evidence.samples.filter(
    (sample) => sample.outcome === "readable",
  ).length;
  const opaque = evidence.samples.filter(
    (sample) => sample.outcome === "opaque",
  ).length;
  const elapsed = evidence.samples
    .filter(
      (sample) => sample.outcome === "readable" || sample.outcome === "opaque",
    )
    .map((sample) => sample.elapsedMs)
    .sort((a, b) => a - b);
  const median = elapsed.length
    ? Math.round(
        (elapsed[Math.floor((elapsed.length - 1) / 2)] +
          elapsed[Math.floor(elapsed.length / 2)]) /
          2,
      )
    : null;
  return (
    <div className="mt-2 border-t border-border pt-1.5 wrap-anywhere">
      <p className={noteClass}>
        {t("ip.scenarios.measurementSource")}：{evidence.source} ·{" "}
        {evidence.protocol} ·{" "}
        {evidence.addressFamily === "unknown"
          ? t("ip.scenarios.addressFamilyUnverified")
          : evidence.addressFamily}
      </p>
      <p className={noteClass}>
        {evidence.direction === "probe-inbound"
          ? t("ip.scenarios.remoteProbesQueriedIp")
          : t("ip.scenarios.currentBrowserTargetService")}
        ：<span className="break-all">{evidence.target}</span>
      </p>
      {evidence.direction === "browser-outbound" && (
        <p className={noteClass}>
          {t("ip.scenarios.observedEgress")}：
          {evidence.egressBefore ?? t("common.unknown")} →{" "}
          {evidence.egressAfter ?? t("common.unknown")}
        </p>
      )}
      <p className={noteClass}>
        {t("ip.scenarios.measuredAt")}：
        {new Date(evidence.checkedAt).toLocaleTimeString()} ·{" "}
        {t("ip.scenarios.validFor5Minutes")}
      </p>
      {!!evidence.samples.length && (
        <>
          <p className={noteClass}>
            {t("ip.scenarios.samplesReadableOpaqueResponses", [
              evidence.samples.length,
              readable,
              opaque,
            ])}
            {median !== null &&
              ` · ${t("ip.scenarios.medianHttpDuration")} ${median} ms`}
          </p>
          <p className={noteClass}>
            {t("ip.scenarios.httpStatus")}：
            {[
              ...new Set(
                evidence.samples.map((sample) => sample.status).filter(Boolean),
              ),
            ].join(" / ") || t("ip.scenarios.unreadable")}
          </p>
        </>
      )}
      {evidence.metrics && (
        <dl className="mt-2 grid grid-cols-2 gap-x-2.5 gap-y-1 text-[11px]">
          {Object.entries(metricLabels)
            .filter(([key]) => key in evidence.metrics!)
            .map(([key, label]) => {
              const value =
                evidence.metrics![key as keyof typeof evidence.metrics];
              return (
                <div key={key} className="flex flex-wrap justify-between gap-1">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd>
                    {typeof value !== "number" || !Number.isFinite(value)
                      ? t("common.unknown")
                      : key === "packetLoss"
                        ? `${(value * 100).toFixed(1)}%`
                        : key === "download" || key === "upload"
                          ? `${(value / 1e6).toFixed(1)} Mbps`
                          : `${Math.round(value)} ms`}
                  </dd>
                </div>
              );
            })}
        </dl>
      )}
      <details>
        <summary className="mt-1.5 cursor-pointer text-[11px]">
          {t("ip.scenarios.viewRawSamples")}
        </summary>
        <pre className="max-h-36 overflow-auto whitespace-pre-wrap break-all text-[10px]">
          {JSON.stringify(evidence.raw ?? evidence.samples, null, 2)}
        </pre>
      </details>
    </div>
  );
}
