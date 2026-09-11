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
import { useMutation } from "@tanstack/react-query";
import { verifyChallenge } from "./api";

type WidgetApi = {
  render(
    container: HTMLElement,
    options: Record<string, unknown>,
  ): string | number;
  reset(id: string | number): void;
  execute?(sitekey: string, options: { action: string }): Promise<string>;
  remove?(id: string | number): void;
};
declare global {
  interface Window {
    turnstile?: WidgetApi;
    grecaptcha?: WidgetApi & { ready(callback: () => void): void };
  }
}
const scripts = new Map<string, Promise<WidgetApi>>();
function loadWidget(id: Provider["id"], sitekey: string): Promise<WidgetApi> {
  const key = id === "recaptcha" ? `${id}:${sitekey}` : "turnstile";
  const existing = scripts.get(key);
  if (existing) return existing;
  const promise = new Promise<WidgetApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      id !== "recaptcha"
        ? "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        : `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(sitekey)}`;
    script.async = true;
    const timer = setTimeout(() => fail(), 15000);
    function fail() {
      clearTimeout(timer);
      script.remove();
      scripts.delete(key);
      reject(new Error(t("验证组件加载失败，请检查网络或内容拦截设置。")));
    }
    script.onerror = fail;
    script.onload = () => {
      const ready = () => {
        const api = id !== "recaptcha" ? window.turnstile : window.grecaptcha;
        if (!api || (id === "recaptcha" ? !api.execute : !api.render)) {
          fail();
          return;
        }
        clearTimeout(timer);
        resolve(api);
      };
      if (id === "recaptcha" && window.grecaptcha?.ready)
        window.grecaptcha.ready(ready);
      else ready();
    };
    document.head.append(script);
  });
  scripts.set(key, promise);
  return promise;
}
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
  const [status, setStatus] = useState(t("加载中"));
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
      setStatus(t("校验超时"));
      setMessage(t("校验未及时完成，请检查网络后重试。"));
      finish();
      if (api && widget !== undefined) api.remove?.(widget);
    }, 45000);
    setStatus(t("加载中"));
    setMessage("");
    setElapsed(undefined);
    void loadWidget(provider.id, provider.sitekey)
      .then(async (loaded) => {
        if (!active) return;
        api = loaded;
        setStatus(t("等待验证"));
        const options = {
          sitekey: provider.sitekey,
          action: "browser_check",
          size: "flexible",
          callback: async (token: string) => {
            if (!active) return;
            setStatus(t("确认结果中"));
            try {
              const result = await mutateAsync({
                provider: provider.id,
                token,
                signal: abort.signal,
              });
              if (!active) return;
              setStatus(result.success ? t("验证通过") : t("未通过"));
              setMessage(t(result.message));
              setScore(result.score);
              finish();
            } catch (error) {
              if (active) {
                finish();
                setStatus(t("未完成"));
                setMessage(
                  error instanceof Error ? error.message : t("验证请求失败"),
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
              setStatus(t("需要交互"));
            }
          },
          "after-interactive-callback": () => {
            if (active) setStatus(t("等待验证"));
          },
          "timeout-callback": () => {
            if (active) {
              finish();
              setStatus(t("校验超时"));
              setMessage(t("请重新开始验证。"));
            }
          },
          "expired-callback": () => {
            if (active) {
              finish();
              setStatus(t("已过期"));
              setMessage(t("请重新开始验证。"));
            }
          },
          "error-callback": () => {
            if (active) {
              finish();
              setStatus(t("未完成"));
              setMessage(
                t("Turnstile 无法完成验证，请检查网络连接及站点允许的域名。"),
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
          setStatus(t("加载失败"));
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
            {t("重新校验")}
          </Button>
        </div>
        <div ref={container} className="max-w-full overflow-x-auto" />
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
      </div>
    );
  return (
    <ToolCard title={provider.name}>
      <div className="row-between gap-3">
        <Badge variant="secondary">
          {provider.configured ? status : t("未配置")}
        </Badge>
        <Button
          disabled={!provider.configured || busy}
          aria-busy={busy}
          className="min-w-24"
          onClick={() => setRound((value) => value + 1)}
        >
          {busy ? <Pending>{t("校验中…")}</Pending> : t("重新开始")}
        </Button>
      </div>
      {score !== undefined && (
        <p className="mt-3 text-sm tabular-nums">
          {t("可信评分")} {score.toFixed(2)} / 1.00 · {t("本站通过阈值")} 0.50
        </p>
      )}
      {provider.id !== "recaptcha" && (
        <p className="small muted mt-3">
          {interaction
            ? t("本次出现交互校验")
            : busy
              ? t("等待交互结果")
              : status === t("验证通过")
                ? t("本次无需交互")
                : t("交互结果未确定")}
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
      <p className="small muted mt-3" role="status">
        {!provider.configured
          ? provider.reason
            ? t(provider.reason)
            : t("当前站点尚未启用此验证。")
          : message || t("页面已自动加载校验，按提示完成操作。")}
        {elapsed !== undefined && t(" · 用时 {0} 秒", [elapsed])}
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
        <Pending>{t("正在读取验证服务…")}</Pending>
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
              "当前环境没有可用的验证配置，请检查正式 Worker 的站点 Key、Secret 和域名白名单。",
            )}
          </p>
        )}
      {query.isError && (
        <Button variant="outline" onClick={() => query.refetch()}>
          {t("重试")}
        </Button>
      )}
      {!compact && !!query.data?.some((provider) => provider.configured) && (
        <div className="mt-3">
          <ToolCard title={t("结果怎么看？")}>
            <p className="small muted">
              {t(
                "通过仅表示本站本次验证成功，不代表其他网站也会通过。Turnstile 体验不等同于 Cloudflare 整站防护挑战。",
              )}
            </p>
            <p className="small muted mt-2">
              {t("FingerprintJS 用于计算浏览器标识，不提供验证码通过结论。")}
              <UnderlineHover asChild>
                <Link to="/browser/fingerprint">{t("查看指纹检测 ›")}</Link>
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
      <PageHeading title={t("人机校验")} description="" />
      <HumanVerification />
    </>
  );
}
