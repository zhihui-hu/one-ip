import { lazy, Suspense, useEffect, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BuildInfo } from "@/components/build-info";
import { AppUpdateChecker } from "@/components/providers/app-update-checker";
import { ThemeToggleButton } from "@/components/theme/theme-toggle-button";
import { Pending } from "@/components/toolkit";
import { AnimatedSegmentedTabs } from "@/components/ui/animated-segmented-tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { UnderlineHover } from "@/components/underline-hover";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/use-theme";
import { Search, Globe, Cable, Activity, Bot } from "lucide-react";
import { Tabs } from "radix-ui";
import { Toaster } from "sonner";
import { activeNavigationRoute, navigationRoutes } from "./routes";

const MobileNavGlass = lazy(() => import("@/components/mobile-nav-glass"));

const menuIcons = {
  "/": Search,
  "/browser/": Globe,
  "/network/": Cable,
  "/ai/": Bot,
  "/status/": Activity,
};

const options = navigationRoutes.map((route) => {
  const Icon = menuIcons[route.value];
  return {
    value: route.value,
    label: (
      <>
        <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
        <span className="nav-full">{route.label}</span>
        <span className="nav-short">{route.short}</span>
      </>
    ),
  };
});

export function AppLayout() {
  const { resolvedTheme } = useTheme();
  const mobile = useIsMobile();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const navRef = useRef<HTMLElement>(null);
  const activeRoute = activeNavigationRoute(pathname);

  useEffect(() => {
    window.scrollTo(0, 0);
    const viewport = navRef.current?.querySelector<HTMLElement>(
      "[data-slot=scroll-area-viewport]",
    );
    const trigger = navRef.current?.querySelector<HTMLElement>(
      "[role=tab][data-state=active]",
    );
    if (!viewport || !trigger) return;
    const parent = viewport.getBoundingClientRect();
    const child = trigger.getBoundingClientRect();
    const offset =
      child.left < parent.left
        ? child.left - parent.left - 8
        : child.right > parent.right
          ? child.right - parent.right + 8
          : 0;
    if (offset)
      viewport.scrollBy({
        left: offset,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }, [pathname]);

  return (
    <>
      <div className="coffee-container">
        <header className="mobile-site-header">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-semibold"
            aria-label="IP 网络工具首页"
          >
            <img src="/icon.svg" width="24" height="24" alt="" />
          </Link>
          <ThemeToggleButton className="size-8 rounded-full text-muted-foreground" />
        </header>
        <AnimatedSegmentedTabs
          label="网络诊断工具"
          options={options}
          value={activeRoute}
          onValueChange={(value) => {
            if (value !== activeRoute) navigate(value);
          }}
          activationMode="manual"
          className="min-w-0"
          listClassName="h-9 w-max justify-start gap-0.5 bg-transparent p-0"
          highlightClassName="rounded-lg bg-primary/10 shadow-none ring-0"
          triggerClassName="h-9 flex-none rounded-lg border-0 px-2 text-[13px] text-muted-foreground hover:bg-accent/50 data-[state=active]:font-semibold data-[state=active]:text-primary"
          renderList={(list) => (
            <nav ref={navRef} className="coffee-nav" aria-label="主导航">
              {mobile && (
                <Suspense fallback={null}>
                  <MobileNavGlass light={resolvedTheme === "light"} />
                </Suspense>
              )}
              <Link
                to="/"
                aria-label="IP 网络工具首页"
                className="site-home-link flex size-9 shrink-0 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
              >
                <img src="/icon.svg" alt="" width="32" height="32" />
              </Link>
              <ScrollArea className="nav-tabs-scroll">
                {list}
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
              <ThemeToggleButton className="size-9 shrink-0 rounded-lg text-muted-foreground" />
            </nav>
          )}
        >
          <Tabs.Content value={activeRoute} asChild>
            <main className="outline-none">
              <Suspense
                fallback={
                  <p className="status-line">
                    <Pending>正在加载页面…</Pending>
                  </p>
                }
              >
                <Outlet />
              </Suspense>
            </main>
          </Tabs.Content>
        </AnimatedSegmentedTabs>
        <footer className="coffee-footer">
          © {new Date().getFullYear()} IP 网络工具 ·{" "}
          <UnderlineHover asChild>
            <Link to="/">IP 查询</Link>
          </UnderlineHover>{" "}
          ·{" "}
          <UnderlineHover asChild>
            <Link to="/browser/privacy/">WebRTC 检测</Link>
          </UnderlineHover>{" "}
          ·{" "}
          <UnderlineHover asChild>
            <Link to="/network/whois/">WHOIS 查询</Link>
          </UnderlineHover>
        </footer>
      </div>
      <aside aria-label="站点通知" className="update-notices">
        <AppUpdateChecker />
      </aside>
      <BuildInfo />
      <Toaster theme={resolvedTheme} position="top-right" />
    </>
  );
}
