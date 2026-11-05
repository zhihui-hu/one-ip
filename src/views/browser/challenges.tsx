import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  PageHeading,
  ToolCard,
  ErrorNotice,
  Pending,
} from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UnderlineHover } from "@/components/underline-hover";
import {
  useChallengeConfig,
  type ChallengeProvider as Provider,
} from "@/hooks/use-challenge-config";
import { t } from "@/i18n";
import { localizeApiMessage } from "@/i18n/api-message";
import { loadWidget, type WidgetApi } from "@/lib/challenge-widget";
import { useMutation } from "@tanstack/react-query";
import { verifyChallenge } from "./api";

function Challenge({
  provider,
  compact = false,
}: {
  provider: Provider;
  compact?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [round, setRound] = useState(1);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(t("common.loadingLabel"));
  const [elapsed, setElapsed] = useState<number>();
  const [busy, setBusy] = useState(true);
  const [interaction, setInteraction] = useState(false);
  const [score, setScore] = useState<number>();
  const { mutateAsync } = useMutation({
    mutationFn: verifyChallenge,
    retry: false,
  });
  useEffect(() => {
    if (!round || !container.current || !provider.sitekey) return;
    let active = true;
    let api: WidgetApi | undefined;
    let widget: string | number | undefined;
    const host = container.current;
    const mount = document.createElement("div");
    if (provider.id !== "recaptcha") mount.style.minWidth = "304px";
    host.append(mount);
    const abort = new AbortController();
    const started = performance.now();
    setBusy(true);
    setInteraction(false);
    setScore(undefined);
    const finish = () => {
      clearTimeout(timer);
      setBusy(false);
      setElapsed(Math.round((performance.now() - started) / 1000));
    };
    const timer = setTimeout(() => {
      if (!active) return;
      active = false;
      abort.abort();
      setStatus(t("challenges.verificationTimedOut"));
      setMessage(
        t("challenges.verificationDidCompleteTimeCheckConnectionTryAgain"),
      );
      finish();
      if (api && widget !== undefined) api.remove?.(widget);
    }, 45000);
    setStatus(t("common.loadingLabel"));
    setMessage("");
    setElapsed(undefined);
    void loadWidget(provider.id, provider.sitekey)
      .then(async (loaded) => {
        if (!active) return;
        api = loaded;
        setStatus(t("challenges.awaitingVerification"));
        const options = {
          sitekey: provider.sitekey,
          action: "browser_check",
          size: "flexible",
          callback: async (token: string) => {
            if (!active) return;
            setStatus(t("challenges.confirmingResult"));
            try {
              const result = await mutateAsync({
                provider: provider.id,
                token,
                signal: abort.signal,
              });
              if (!active) return;
              setStatus(
                result.success
                  ? t("challenges.verified")
                  : t("challenges.notPassed"),
              );
              setMessage(localizeApiMessage(result.message));
              setScore(result.score);
              finish();
            } catch (error) {
              if (active) {
                finish();
                setStatus(t("common.incomplete"));
                setMessage(
                  error instanceof Error
                    ? error.message
                    : t("challenges.verificationRequestFailed"),
                );
              }
            }
          },
          retry: "never",
          "refresh-expired": "manual",
          "refresh-timeout": "manual",
          "before-interactive-callback": () => {
            if (active) {
              setInteraction(true);
              setStatus(t("challenges.interactionRequired"));
            }
          },
          "after-interactive-callback": () => {
            if (active) setStatus(t("challenges.awaitingVerification"));
          },
          "timeout-callback": () => {
            if (active) {
              finish();
              setStatus(t("challenges.verificationTimedOut"));
              setMessage(t("challenges.pleaseRestartVerification"));
            }
          },
          "expired-callback": () => {
            if (active) {
              finish();
              setStatus(t("challenges.expired"));
              setMessage(t("challenges.pleaseRestartVerification"));
            }
          },
          "error-callback": () => {
            if (active) {
              finish();
              setStatus(t("common.incomplete"));
              setMessage(
                t(
                  "challenges.turnstileCouldCompleteVerificationCheckConnectivitySiteS",
                ),
              );
            }
          },
        };
        if (provider.id === "recaptcha") {
          const token = await api.execute!(provider.sitekey!, {
            action: "browser_check",
          });
          if (active) await options.callback(token);
        } else {
          widget = api.render(mount, options);
        }
      })
      .catch((error) => {
        if (active) {
          finish();
          setStatus(t("common.loadFailed"));
          setMessage(error.message);
        }
      });
    return () => {
      active = false;
      clearTimeout(timer);
      abort.abort();
      if (api && widget !== undefined) {
        try {
          if (api.remove) api.remove(widget);
          else api.reset(widget);
        } catch {
          /* Widget may have already removed itself. */
        }
      }
      host.replaceChildren();
    };
  }, [round, provider.id, provider.sitekey, mutateAsync]);
  if (compact)
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm" role="status">
            {busy ? <Pending>{status}</Pending> : status}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            aria-busy={busy}
            onClick={() => setRound((value) => value + 1)}
          >
            {t("challenges.verifyAgain")}
          </Button>
        </div>
        <div ref={container} className="max-w-full overflow-x-auto" />
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
      </div>
    );
  return (
    <ToolCard title={provider.name}>
      <div className="flex items-center justify-between gap-3">
        <Badge variant="secondary">
          {provider.configured ? status : t("common.notConfigured")}
        </Badge>
        <Button
          disabled={!provider.configured || busy}
          aria-busy={busy}
          className="min-w-24"
          onClick={() => setRound((value) => value + 1)}
        >
          {busy ? (
            <Pending>{t("challenges.verifying")}</Pending>
          ) : (
            t("challenges.restart")
          )}
        </Button>
      </div>
      {score !== undefined && (
        <p className="mt-3 text-sm tabular-nums">
          {t("challenges.confidenceScore")} {score.toFixed(2)} / 1.00 ·{" "}
          {t("challenges.sitePassThreshold")} 0.50
        </p>
      )}
      {provider.id !== "recaptcha" && (
        <p className="mt-3 text-[0.78rem] text-muted-foreground">
          {interaction
            ? t("challenges.anInteractiveChallengeWasShown")
            : busy
              ? t("challenges.waitingForInteractionResult")
              : status === t("challenges.verified")
                ? t("challenges.noInteractionWasRequired")
                : t("challenges.interactionResultUndetermined")}
        </p>
      )}
      <div
        ref={container}
        className={
          round && provider.id !== "recaptcha"
            ? "mt-4 min-h-20 w-full min-w-0 overflow-x-auto pb-1"
            : ""
        }
      />
      <p className="mt-3 text-[0.78rem] text-muted-foreground" role="status">
        {!provider.configured
          ? provider.reason
            ? localizeApiMessage(provider.reason)
            : t("challenges.verificationEnabledCurrentSite")
          : message ||
            t(
              "challenges.verificationLoadedAutomaticallyFollowAnyPromptsToContinue",
            )}
        {elapsed !== undefined && t("challenges.timeSeconds", [elapsed])}
      </p>
    </ToolCard>
  );
}
export function HumanVerification({
  compact = false,
}: { compact?: boolean } = {}) {
  const query = useChallengeConfig();
  const configured =
    query.data?.filter((provider) => provider.configured) ?? [];
  const providers = compact
    ? [
        configured.find((provider) => provider.id === "turnstile") ??
          configured[0],
      ].filter((provider): provider is Provider => !!provider)
    : configured;
  return (
    <>
      <ErrorNotice error={query.error} />
      {query.isPending ? (
        <Pending>{t("challenges.loadingVerificationService")}</Pending>
      ) : (
        <div className={compact ? "" : "grid gap-3 lg:grid-cols-2"}>
          {providers.map((provider) => (
            <Challenge
              key={provider.id}
              provider={provider}
              compact={compact}
            />
          ))}
        </div>
      )}
      {!query.isPending &&
        !query.isError &&
        !query.data?.some((provider) => provider.configured) && (
          <p className="text-sm text-muted-foreground">
            {t(
              "challenges.verificationConfigurationAvailableEnvironmentCheckProductionWorkerS",
            )}
          </p>
        )}
      {query.isError && (
        <Button variant="outline" onClick={() => query.refetch()}>
          {t("common.retry")}
        </Button>
      )}
      {!compact && !!query.data?.some((provider) => provider.configured) && (
        <div className="mt-3">
          <ToolCard title={t("challenges.howToInterpretTheResult")}>
            <p className="text-[0.78rem] text-muted-foreground">
              {t(
                "challenges.passingMeansAttemptSiteSucceededDoesGuaranteePassing",
              )}
            </p>
            <p className="mt-2 text-[0.78rem] text-muted-foreground">
              {t(
                "challenges.fingerprintjsCalculatesBrowserIdentifierDoesDetermineCaptchaSuccess",
              )}
              <UnderlineHover asChild>
                <Link to="/browser/fingerprint">
                  {t("challenges.viewFingerprintCheck")}
                </Link>
              </UnderlineHover>
            </p>
          </ToolCard>
        </div>
      )}
    </>
  );
}

export default function ChallengesPage() {
  return (
    <>
      <PageHeading title={t("common.humanVerification")} />
      <HumanVerification />
    </>
  );
}
