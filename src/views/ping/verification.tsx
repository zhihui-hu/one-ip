import { useEffect, useRef } from "react";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { t } from "@/i18n";
import { loadWidget, type WidgetApi } from "@/lib/challenge-widget";
import { endpoint } from "@/lib/network";
import { createRoot } from "react-dom/client";

export type PingVerification = {
  provider: "turnstile" | "turnstile-noninteractive";
  token: string;
};
type ChallengeProvider = {
  id: PingVerification["provider"];
  name: string;
  configured: boolean;
  reason?: string;
  sitekey?: string;
};
type TurnstileProvider = ChallengeProvider & { sitekey: string };

function VerificationWidget({
  provider,
  onToken,
  onError,
}: {
  provider: TurnstileProvider;
  onToken: (token: string) => void;
  onError: (error: Error) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = container.current;
    if (!host) return;
    let active = true;
    let api: WidgetApi | undefined;
    let widget: string | number | undefined;
    void loadWidget()
      .then((loaded) => {
        if (!active) return;
        api = loaded;
        widget = api.render(host, {
          sitekey: provider.sitekey,
          action: "ping_start",
          size: "flexible",
          callback: (token: string) => {
            if (active) onToken(token);
          },
          retry: "never",
          "refresh-expired": "manual",
          "refresh-timeout": "manual",
          "error-callback": () => {
            if (active)
              onError(
                new Error(
                  t("api.verificationServiceUnavailablePleaseRetryLater"),
                ),
              );
          },
          "expired-callback": () => {
            if (active)
              onError(
                new Error(
                  t("api.verificationFailedTokenExpiredPleaseVerifyAgain"),
                ),
              );
          },
          "timeout-callback": () => {
            if (active)
              onError(new Error(t("challenges.verificationTimedOut")));
          },
        });
      })
      .catch((error) => {
        if (active) onError(error);
      });
    return () => {
      active = false;
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
  }, [provider, onToken, onError]);
  return <div ref={container} className="min-h-20 w-full overflow-x-auto" />;
}

export async function getPingVerification(
  signal: AbortSignal,
): Promise<PingVerification> {
  signal.throwIfAborted();
  const providers = (
    await endpoint<ChallengeProvider[]>("/browser/challenges", { signal })
  ).filter(
    (provider): provider is TurnstileProvider =>
      provider.configured && !!provider.sitekey,
  );
  signal.throwIfAborted();
  const provider =
    providers.find((item) => item.id === "turnstile") ?? providers[0];
  if (!provider) throw new Error(t("api.verificationServiceConfiguredSite"));
  return new Promise<PingVerification>((resolve, reject) => {
    const mount = document.createElement("div");
    document.body.append(mount);
    const root = createRoot(mount);
    let settled = false;
    const finish = (token?: string, error?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      queueMicrotask(() => {
        root.unmount();
        mount.remove();
      });
      if (token) resolve({ provider: provider.id, token });
      else reject(error);
    };
    const abort = () => finish(undefined, signal.reason);
    const cancel = () =>
      finish(undefined, new DOMException(t("common.cancelled"), "AbortError"));
    const timer = setTimeout(
      () => finish(undefined, new Error(t("challenges.verificationTimedOut"))),
      120_000,
    );
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    else
      root.render(
        <ResponsiveDialog
          open
          onOpenChange={(open) => {
            if (!open) cancel();
          }}
          title={t("common.humanVerification")}
          description={t("ping.verifyBeforeMeasurement")}
        >
          <p className="text-sm text-muted-foreground" role="status">
            {t("challenges.awaitingVerification")}
          </p>
          <VerificationWidget
            provider={provider}
            onToken={(token) => finish(token)}
            onError={(error) => finish(undefined, error)}
          />
        </ResponsiveDialog>,
      );
  });
}
