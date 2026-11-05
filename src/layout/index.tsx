import { lazy, Suspense, useEffect, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AuthorContact } from "@/components/author-contact";
import { HomePageSkeleton } from "@/components/home-page-skeleton";
import { IpSearch } from "@/components/ip-search";
import { LanguageSelect } from "@/components/language-select";
import { AppUpdateChecker } from "@/components/providers/app-update-checker";
import { ShareSite } from "@/components/share-site";
import { ThemeToggleButton } from "@/components/theme/theme-toggle-button";
import { Pending, PrivacyToggle } from "@/components/toolkit";
import { AnimatedSegmentedTabs } from "@/components/ui/animated-segmented-tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { UnderlineHover } from "@/components/underline-hover";
import { useAvailableTools } from "@/hooks/use-available-tools";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/use-theme";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { Cable, Globe, House, Search, Sparkles } from "lucide-react";
import { Tabs } from "radix-ui";
import { Toaster } from "sonner";
import { DesktopNavigation } from "./desktop-navigation";
import type { NavigationMenus } from "./navigation-menus";
import { RouteErrorBoundary } from "./route-error-boundary";
import { activeNavigationRoute, navigationRoutes, toolGroups } from "./routes";
import { SectionTabs } from "./section-tabs";

const MobileNavGlass = lazy(() => import("@/components/mobile-nav-glass"));
// Console-only metadata; keep date-fns out of the entry chunk.
const BuildInfo = lazy(() =>
  import("@/components/build-info").then((m) => ({ default: m.BuildInfo })),
);
const currentYear = new Date().getFullYear();

/** Header icon buttons are uniform regardless of each button's own variant. */
const headerActionsClass =
  "flex items-center gap-1 [&>button]:size-8! [&>button]:rounded-lg! [&>button]:border-border! [&>button]:bg-card! [&>button]:p-0! [&>button]:text-muted-foreground! [&>button]:hover:bg-muted! [&>button]:hover:text-foreground! [&>[data-ip-search]]:w-auto! [&>[data-ip-search]]:px-2!";
/** App-wide card defaults (every card rendered inside the layout). */
const containerCardClass =
  "[&_[data-slot=card]]:mt-2 [&_[data-slot=card]]:border-0 [&_[data-slot=card]]:[box-shadow:none] [&_[data-slot=card]]:[--card-spacing:12px]";
const navClass = cn(
  "flex items-center justify-between gap-2 mb-4 p-2 rounded-xl bg-card",
  // Desktop: floating pill that gains a surface once the page scrolls.
  "md:sticky md:top-2 md:z-40 md:mb-3 md:min-h-11 md:gap-6 md:rounded-[999px] md:border md:border-transparent md:bg-transparent md:py-1 md:pr-1.5 md:pl-3 md:transition-[background-color,border-color,box-shadow] md:duration-200 md:ease-[ease]",
  "md:data-[scrolled=true]:border-[color-mix(in_srgb,var(--border)_70%,transparent)] md:data-[scrolled=true]:bg-[color-mix(in_srgb,var(--card)_88%,transparent)] md:data-[scrolled=true]:[box-shadow:0_8px_24px_-10px_color-mix(in_srgb,var(--foreground)_20%,transparent),0_1px_3px_color-mix(in_srgb,var(--foreground)_6%,transparent)] md:data-[scrolled=true]:backdrop-blur-[16px] md:data-[scrolled=true]:backdrop-saturate-[1.4]",
  // Mobile: fixed bottom tab bar.
  "max-md:fixed max-md:right-auto max-md:bottom-[calc(10px+env(safe-area-inset-bottom,0px))] max-md:left-1/2 max-md:z-40 max-md:m-0 max-md:h-[52px] max-md:w-[calc(100%-2*max(16px,env(safe-area-inset-left,0px),env(safe-area-inset-right,0px)))] max-md:max-w-[400px] max-md:transform-[translateX(-50%)] max-md:gap-1 max-md:rounded-[20px] max-md:p-[3px]",
  "max-md:bg-[color-mix(in_srgb,var(--card)_78%,transparent)] max-md:[box-shadow:0_8px_32px_#0002,inset_0_1px_0_#ffffff80] max-md:backdrop-blur-[22px] max-md:backdrop-saturate-[180%] dark:max-md:bg-[color-mix(in_srgb,var(--card)_85%,transparent)] dark:max-md:[box-shadow:0_8px_32px_#0006,inset_0_1px_0_#ffffff18]",
  "max-md:[@supports_not_(backdrop-filter:blur(1px))]:bg-card max-md:[@media(prefers-reduced-transparency:reduce)]:bg-card max-md:[@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none",
  "max-md:has-[[data-mobile-nav-glass]]:bg-transparent max-md:has-[[data-mobile-nav-glass]]:[box-shadow:none] max-md:has-[[data-mobile-nav-glass]]:backdrop-filter-none dark:max-md:has-[[data-mobile-nav-glass]]:bg-transparent dark:max-md:has-[[data-mobile-nav-glass]]:[box-shadow:none]",
);

const menuIcons = {
  "/": House,
  "/lookup/": Search,
  "/network/": Cable,
  "/browser/": Globe,
  "/ai/": Sparkles,
};

const options = navigationRoutes.map((route) => {
  const Icon = menuIcons[route.value];
  return {
    value: route.value,
    label: (
      <>
        <Icon
          className="block size-[19px]"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <span className="hidden">{route.label}</span>
        <span>{route.short}</span>
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
  const browserTools = useAvailableTools("browser");
  const menus: NavigationMenus = {
    "/lookup/": toolGroups.lookup,
    "/network/": toolGroups.network,
    "/browser/": browserTools,
    "/ai/": toolGroups.ai,
  };

  useEffect(() => {
    if (mobile) return;
    const update = () => {
      navRef.current?.setAttribute("data-scrolled", String(window.scrollY > 8));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [mobile]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const viewport = navRef.current?.querySelector<HTMLElement>(
      "[data-slot=scroll-area-viewport]",
    );
    const trigger = navRef.current?.querySelector<HTMLElement>(
      '[role="tab"][aria-selected="true"]',
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
      <div
        className={cn(
          "mx-auto w-full max-w-[1000px] px-5 py-4 max-md:pb-[calc(82px+env(safe-area-inset-bottom,0px))] max-xs:px-3 max-xs:pt-2.5",
          containerCardClass,
        )}
      >
        <header className="mb-2 hidden items-center justify-between max-md:flex">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-semibold"
            aria-label={t("navigation.siteTitle")}
          >
            <img src="/icon.svg" width="24" height="24" alt="" />
          </Link>
          <div className={headerActionsClass}>
            {mobile && <IpSearch />}
            <PrivacyToggle iconOnly />
            <LanguageSelect />
            <ThemeToggleButton className="size-8 rounded-full text-muted-foreground" />
            <ShareSite />
          </div>
        </header>
        <AnimatedSegmentedTabs
          label={t("navigation.diagnostics")}
          options={options}
          value={activeRoute}
          onValueChange={(value) => {
            if (value !== activeRoute) navigate(value);
          }}
          activationMode="manual"
          listVisible={mobile}
          className="min-w-0"
          listClassName="flex h-[46px] w-full justify-center gap-0 bg-transparent p-0"
          highlightClassName="rounded-[17px] bg-[color-mix(in_srgb,var(--primary)_13%,transparent)] [box-shadow:none]"
          triggerClassName="h-[46px] min-w-0 flex-[1_1_0px] flex-col gap-0.5 rounded-[17px] border-0 px-0.5 py-1 text-[10px]/[14px] text-muted-foreground hover:bg-accent/50 aria-selected:font-semibold aria-selected:text-primary"
          renderList={(list) => (
            <nav
              ref={navRef}
              className={navClass}
              aria-label={t("navigation.main")}
            >
              {mobile && (
                <Suspense fallback={null}>
                  <MobileNavGlass light={resolvedTheme === "light"} />
                </Suspense>
              )}
              <Link
                to="/"
                aria-label={t("navigation.siteTitle")}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-ring max-md:hidden md:h-11 md:w-8 md:p-0"
              >
                <img
                  src="/icon.svg"
                  alt=""
                  width="32"
                  height="32"
                  className="md:size-6"
                />
              </Link>
              {mobile ? (
                <ScrollArea className="relative z-[1] w-full min-w-0 flex-1 rounded-lg [&_[data-slot=scroll-area-scrollbar][data-orientation=vertical]]:hidden">
                  {list}
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              ) : (
                <DesktopNavigation activeRoute={activeRoute} />
              )}
              <div
                className={cn(
                  headerActionsClass,
                  "max-md:hidden md:gap-1.5 md:border-0 md:ps-0",
                )}
              >
                {!mobile && <IpSearch />}
                <PrivacyToggle iconOnly />
                <LanguageSelect />
                <ThemeToggleButton className="size-9 shrink-0 rounded-lg text-muted-foreground" />
                <ShareSite />
              </div>
            </nav>
          )}
        >
          <Tabs.Content
            value={activeRoute}
            aria-labelledby={undefined}
            aria-label={
              navigationRoutes.find((route) => route.value === activeRoute)
                ?.label ?? t("navigation.diagnostics")
            }
            asChild
          >
            <main className="outline-none">
              {menus[activeRoute] && (
                <SectionTabs
                  label={
                    navigationRoutes.find(
                      (route) => route.value === activeRoute,
                    )!.label
                  }
                  items={menus[activeRoute]!}
                />
              )}
              <RouteErrorBoundary key={pathname}>
                <Suspense
                  fallback={
                    activeRoute === "/" ? (
                      <HomePageSkeleton />
                    ) : (
                      <p className="py-5 text-center text-[0.88rem] leading-[1.8] text-muted-foreground">
                        <Pending>{t("navigation.loadingPage")}</Pending>
                      </p>
                    )
                  }
                >
                  <Outlet />
                </Suspense>
              </RouteErrorBoundary>
            </main>
          </Tabs.Content>
        </AnimatedSegmentedTabs>
        <footer className="max-w-full overflow-x-auto pt-[30px] pb-5 text-center text-[0.82rem] whitespace-nowrap text-subtle max-sm:pt-5 max-sm:pb-4 max-sm:text-left max-sm:text-[0.75rem] max-sm:[-webkit-overflow-scrolling:touch]">
          © {currentYear} IP ·{" "}
          <UnderlineHover asChild>
            <a
              href="https://huzhihui.com/blog/one-ip-guide"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("navigation.documentation")}
            </a>
          </UnderlineHover>{" "}
          ·{" "}
          <UnderlineHover asChild>
            <Link to="/docs/api">API</Link>
          </UnderlineHover>{" "}
          ·{" "}
          <UnderlineHover asChild>
            <Link to="/terms">{t("policy.terms")}</Link>
          </UnderlineHover>{" "}
          ·{" "}
          <UnderlineHover asChild>
            <Link to="/privacy">{t("policy.privacy")}</Link>
          </UnderlineHover>{" "}
          ·{" "}
          <UnderlineHover asChild>
            <a
              href="https://github.com/zhihui-hu/one-ip"
              target="_blank"
              rel="noopener noreferrer"
              className="align-middle"
            >
              GitHub
            </a>
          </UnderlineHover>{" "}
          ·{" "}
          <UnderlineHover asChild>
            <AuthorContact />
          </UnderlineHover>{" "}
          ·{" "}
          <UnderlineHover asChild>
            <a href="https://ipbot.net">
              {t("navigation.commercialProjectExample")}
            </a>
          </UnderlineHover>
        </footer>
      </div>
      <aside
        aria-label={t("navigation.notifications")}
        className="fixed right-4 bottom-4 z-50 w-[min(23rem,calc(100%-32px))] max-md:bottom-[calc(76px+env(safe-area-inset-bottom,0px))]"
      >
        <AppUpdateChecker />
      </aside>
      <Suspense fallback={null}>
        <BuildInfo />
      </Suspense>
      <Toaster richColors theme={resolvedTheme} position="top-right" />
    </>
  );
}
