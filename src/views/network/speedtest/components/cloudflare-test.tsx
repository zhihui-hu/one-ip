import {
  ActionButton,
  ErrorNotice,
  IpText,
  Pending,
} from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { t } from "@/i18n";
import { Globe, Play, Square } from "lucide-react";
import { TransferCard, decimal, formatBytes } from "./transfer-card";
import {
  DOWNLOAD_LIMIT,
  TRANSFER_SECONDS,
  UPLOAD_LIMIT,
  type Phase,
} from "../api";
import { useSpeedtest } from "../use-speedtest";

const phases: Record<Phase, string> = {
  idle: t("speedtest.ready"),
  latency: t("speedtest.testingLatency"),
  download: t("speedtest.testingDownload"),
  upload: t("speedtest.testingUpload"),
  complete: t("speedtest.complete"),
  stopped: t("speedtest.stopped"),
  error: t("speedtest.error"),
};

export function CloudflareTest() {
  const { result, connections, setConnections, busy, error, start, stop } =
    useSpeedtest();
  const partial = result.phase === "stopped" || result.phase === "error";
  return (
    <div className="flex flex-col gap-4">
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Globe className="size-3.5" aria-hidden="true" />
        {t("speedtest.endpoint")}
      </span>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ActionButton busy={busy} onClick={start}>
            <Play data-icon="inline-start" />
            {t("speedtest.start")}
          </ActionButton>
          {busy && (
            <Button variant="outline" onClick={stop}>
              <Square data-icon="inline-start" />
              {t("speedtest.stop")}
            </Button>
          )}
        </div>
        <label
          className="flex items-center gap-2 text-sm"
          htmlFor="speedtest-multiple"
        >
          <span className="text-muted-foreground">{t("speedtest.single")}</span>
          <Switch
            id="speedtest-multiple"
            checked={connections === 4}
            disabled={busy}
            onCheckedChange={(checked) => setConnections(checked ? 4 : 1)}
            aria-label={t("speedtest.multiple")}
          />
          <span>{t("speedtest.multiple")}</span>
        </label>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        {t("speedtest.trafficNotice", [
          formatBytes(DOWNLOAD_LIMIT),
          formatBytes(UPLOAD_LIMIT),
          TRANSFER_SECONDS,
        ])}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3 border-y py-3">
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">
              {t("speedtest.latency")}
            </dt>
            <dd className="text-xl font-semibold tabular-nums">
              {result.latency == null ? "—" : decimal(result.latency)}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                ms
              </span>
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">
              {t("speedtest.jitter")}
            </dt>
            <dd className="text-xl font-semibold tabular-nums">
              {result.jitter == null ? "—" : decimal(result.jitter)}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                ms
              </span>
            </dd>
          </div>
        </dl>
        <span
          className="text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {busy ? (
            <Pending>{phases[result.phase]}</Pending>
          ) : (
            phases[result.phase]
          )}
        </span>
      </div>
      <ErrorNotice error={error} />
      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
        {(["download", "upload"] as const).map((direction) => (
          <TransferCard
            key={direction}
            direction={direction}
            value={result[direction]}
            active={result.phase === direction && busy}
            partial={partial}
          />
        ))}
      </div>

      {result.node && (
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <dt className="text-muted-foreground">{t("speedtest.egress")}</dt>
            <dd>
              <IpText ip={result.node.ip} />
            </dd>
          </div>
          {result.node.colo && (
            <div className="flex items-center gap-2">
              <dt className="text-muted-foreground">{t("speedtest.node")}</dt>
              <dd>{result.node.colo}</dd>
            </div>
          )}
        </dl>
      )}
      <div className="flex flex-col gap-1 text-xs leading-5 text-muted-foreground">
        <p>{t("speedtest.methodNotice")}</p>
        <p>{t("speedtest.uploadNotice")}</p>
      </div>
    </div>
  );
}
