import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { t } from "@/i18n";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ShieldCheck } from "lucide-react";

gsap.registerPlugin(useGSAP);

const CONSENT_STORAGE_KEY = "starter_cookie_consent";
const CONSENT_COOKIE_NAME = "starter_cookie_consent";

function getStoredConsent() {
  if (typeof window === "undefined") return false;

  try {
    if (window.localStorage.getItem(CONSENT_STORAGE_KEY) === "accepted") {
      return true;
    }
  } catch {
    /* ignore */
  }

  if (typeof document !== "undefined") {
    return document.cookie
      .split(";")
      .map((s) => s.trim())
      .some((s) => s === `${CONSENT_COOKIE_NAME}=accepted`);
  }
  return false;
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(() => !getStoredConsent());
  const [accepting, setAccepting] = useState(false);

  // refs for GSAP
  const wrapperRef = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  // 初始化 / 播放入场动画
  useGSAP(
    () => {
      if (
        !visible ||
        !wrapperRef.current ||
        !cardRef.current ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;

      const ctx = gsap.context(() => {
        const items = wrapperRef.current!.querySelectorAll("[data-cc-item]");

        // 先清理旧的时间线
        tlRef.current?.kill();

        // 入场 timeline（稍微上浮、淡入，内容 stagger）
        const tl = gsap.timeline({
          defaults: { ease: "power2.out" },
          paused: true,
        });

        tl
          // 外层整体浮入
          .from(wrapperRef.current, {
            y: 12,
            opacity: 0,
            duration: 0.28,
            willChange: "transform,opacity",
          })
          // 卡片轻浮入
          .from(
            cardRef.current,
            {
              y: 8,
              opacity: 0,
              duration: 0.25,
              willChange: "transform,opacity",
            },
            "<", // 与上一段同时开始
          )
          // 主要内容逐项进入
          .from(
            items,
            {
              y: 6,
              opacity: 0,
              duration: 0.22,
              stagger: 0.04,
              willChange: "transform,opacity",
            },
            "-=0.06",
          );

        tl.play();
        tlRef.current = tl;
      }, wrapperRef);

      return () => {
        ctx.revert();
        tlRef.current = null;
      };
    },
    { dependencies: [visible], revertOnUpdate: true },
  );

  const persistConsent = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(CONSENT_STORAGE_KEY, "accepted");
      } catch {
        /* ignore */
      }
    }
    if (typeof document !== "undefined") {
      document.cookie = `${CONSENT_COOKIE_NAME}=accepted; path=/; max-age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
    }
  }, []);

  const handleAccept = () => {
    if (accepting) return;
    setAccepting(true);
    persistConsent();

    // 优先用时间线反向做退场；若未创建则直接隐藏
    if (tlRef.current) {
      tlRef.current.eventCallback("onReverseComplete", () => {
        setVisible(false);
      });
      if (tlRef.current.time() === 0) setVisible(false);
      else tlRef.current.timeScale(1.1).reverse();
    } else {
      // 回退：无 tl 时也保证隐藏
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <Dialog>
      <section
        ref={wrapperRef}
        role="region"
        aria-live="polite"
        aria-label={t("必要存储说明")}
        className="pointer-events-auto w-full"
      >
        <Card
          ref={cardRef}
          size="sm"
          className="w-full gap-0 rounded-xl border border-border/60 shadow-none ring-0"
        >
          <CardHeader className="flex items-start gap-2.5" data-cc-item>
            <ShieldCheck
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <CardTitle className="leading-5">{t("尊重你的隐私")}</CardTitle>
              <CardDescription className="mt-0.5 text-xs leading-5">
                {t("仅保存界面偏好，不用于广告追踪。")}
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs leading-5"
                    aria-label={t("查看浏览器存储说明")}
                  >
                    {t("说明")}
                  </Button>
                </DialogTrigger>
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              className="h-7 shrink-0 self-center px-2.5 text-xs"
              onClick={handleAccept}
              disabled={accepting}
              aria-busy={accepting}
              aria-label={t("确认已阅读必要存储说明")}
            >
              {t("知道了")}
            </Button>
          </CardHeader>
        </Card>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("浏览器存储说明")}</DialogTitle>
            <DialogDescription className="pt-2 leading-6">
              {t(
                "本站用本地存储记住主题和界面偏好；确认此提示后，会写入 starter_cookie_consent 标记和一年有效的同名 Cookie。你可以通过浏览器的网站数据设置清除这些信息。模板不包含广告或行为分析，“知道了”不代表同意非必要追踪。",
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </section>
    </Dialog>
  );
}
