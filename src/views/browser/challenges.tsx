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
import { t } from "@/i18n";
import { endpoint } from "@/lib/network";
import { useQuery } from "@tanstack/react-query";

type Provider = {
  id: "turnstile" | "recaptcha";
  name: string;
  configured: boolean;
  reason?: string;
  sitekey?: string;
};
type WidgetApi = {
  render(
    container: HTMLElement,
    options: Record<string, unknown>,
  ): string | number;
  reset(id: string | number): void;
  remove?(id: string | number): void;
};
declare global {
  interface Window {
    turnstile?: WidgetApi;
    grecaptcha?: WidgetApi & { ready(callback: () => void): void };
  }
}
const scripts = new Map<string, Promise<WidgetApi>>();
function loadWidget(id: Provider["id"]): Promise<WidgetApi> {
  const existing = scripts.get(id);
  if (existing) return existing;
  const promise = new Promise<WidgetApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      id === "turnstile"
        ? "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        : "https://www.google.com/recaptcha/api.js?render=explicit";
    script.async = true;
    const timer = setTimeout(() => fail(), 15000);
    function fail() {
      clearTimeout(timer);
      script.remove();
      scripts.delete(id);
      reject(new Error(t("验证组件加载失败，请检查网络或内容拦截设置。")));
    }
    script.onerror = fail;
    script.onload = () => {
      const ready = () => {
        const api = id === "turnstile" ? window.turnstile : window.grecaptcha;
        if (!api?.render) {
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
  scripts.set(id, promise);
  return promise;
}
function Challenge({ provider }: { provider: Provider }) {
  const container = useRef<HTMLDivElement>(null);
  const [round, setRound] = useState(0);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(t("待开始"));
  const [elapsed, setElapsed] = useState<number>();
  useEffect(() => {
    if (!round || !container.current || !provider.sitekey) return;
    let active = true;
    let api: WidgetApi | undefined;
    let widget: string | number | undefined;
    const host = container.current;
    const mount = document.createElement("div");
    mount.style.minWidth = "304px";
    host.append(mount);
    const abort = new AbortController();
    const started = performance.now();
    setStatus(t("加载中"));
    setMessage("");
    setElapsed(undefined);
    void loadWidget(provider.id)
      .then((loaded) => {
        if (!active) return;
        api = loaded;
        setStatus(t("等待验证"));
        widget = api.render(mount, {
          sitekey: provider.sitekey,
          ...(provider.id === "turnstile"
            ? { action: "browser_check", size: "flexible" }
            : { size: "normal" }),
          callback: async (token: string) => {
            if (!active) return;
            setStatus(t("确认结果中"));
            try {
              const result = await endpoint<{
                success: boolean;
                message: string;
              }>("/browser/challenges/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider: provider.id, token }),
                signal: abort.signal,
              });
              if (!active) return;
              setStatus(result.success ? t("验证通过") : t("未通过"));
              setMessage(t(result.message));
              setElapsed(Math.round((performance.now() - started) / 1000));
            } catch (error) {
              if (active) {
                setStatus(t("未完成"));
                setMessage(
                  error instanceof Error ? error.message : t("验证请求失败"),
                );
              }
            }
          },
          "expired-callback": () => {
            if (active) {
              setStatus(t("已过期"));
              setMessage(t("请重新开始验证。"));
            }
          },
          "error-callback": () => {
            if (active) {
              setStatus(t("未完成"));
              setMessage(
                provider.id === "recaptcha"
                  ? t(
                      "验证组件未完成加载。若上方提示密钥类型无效，请使用 reCAPTCHA v2「我不是机器人」复选框类型的站点 Key 和配套 Secret；v3 或其他类型不能用于此组件。",
                    )
                  : t(
                      "Turnstile 无法完成验证，请检查网络连接及站点允许的域名。",
                    ),
              );
            }
          },
        });
      })
      .catch((error) => {
        if (active) {
          setStatus(t("加载失败"));
          setMessage(error.message);
        }
      });
    return () => {
      active = false;
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
  }, [round, provider.id, provider.sitekey]);
  return (
    <ToolCard title={provider.name}>
      <div className="row-between gap-3">
        <Badge variant="secondary">
          {provider.configured ? status : t("未配置")}
        </Badge>
        <Button
          disabled={!provider.configured}
          onClick={() => setRound((value) => value + 1)}
        >
          {round ? t("重新开始") : t("开始体验")}
        </Button>
      </div>
      <div
        ref={container}
        className={
          round ? "mt-4 min-h-20 w-full min-w-0 overflow-x-auto pb-1" : ""
        }
      />
      <p className="small muted mt-3" role="status">
        {!provider.configured
          ? provider.reason
            ? t(provider.reason)
            : t("当前站点尚未启用此验证。")
          : message || t("点击后加载验证服务，按提示完成操作。")}
        {elapsed !== undefined && t(" · 用时 {0} 秒", [elapsed])}
      </p>
    </ToolCard>
  );
}
export default function ChallengesPage() {
  const query = useQuery({
    queryKey: ["challenge-config"],
    queryFn: ({ signal }) =>
      endpoint<Provider[]>("/browser/challenges", { signal }),
    retry: false,
  });
  return (
    <>
      <PageHeading title={t("验证体验")} description="" />
      <ErrorNotice error={query.error} />
      {query.isPending ? (
        <Pending>{t("正在读取验证服务…")}</Pending>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {query.data?.map((provider) => (
            <Challenge key={provider.id} provider={provider} />
          ))}
        </div>
      )}
      {!query.isPending && !query.isError && !query.data?.length && (
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
      {!!query.data?.length && (
        <div className="mt-3">
          <ToolCard title={t("结果怎么看？")}>
            <p className="small muted">
              {t(
                "通过仅表示本站本次验证成功，不代表其他网站也会通过。Turnstile 体验不等同于 Cloudflare 整站防护挑战。",
              )}
            </p>
            <p className="small muted mt-2">
              {t("FingerprintJS 用于计算浏览器标识，不提供验证码通过结论。")}
              <Link to="/browser/fingerprint">{t("查看指纹检测 ›")}</Link>
            </p>
          </ToolCard>
        </div>
      )}
    </>
  );
}
