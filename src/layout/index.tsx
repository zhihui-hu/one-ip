import { lazy, Suspense, useEffect, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { HomePageSkeleton } from "@/components/home-page-skeleton";
import { LanguageSelect } from "@/components/language-select";
import { AppUpdateChecker } from "@/components/providers/app-update-checker";
import { ShareSite } from "@/components/share-site";
import { ThemeToggleButton } from "@/components/theme/theme-toggle-button";
import { Pending } from "@/components/toolkit";
import { AnimatedSegmentedTabs } from "@/components/ui/animated-segmented-tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { UnderlineHover } from "@/components/underline-hover";
import { useAvailableTools } from "@/hooks/use-available-tools";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/use-theme";
import { t } from "@/i18n";
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
      <div className="app-container">
        <header className="mobile-site-header">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-semibold"
            aria-label={t("navigation.siteTitle")}
          >
            <img src="/icon.svg" width="24" height="24" alt="" />
          </Link>
          <div className="flex items-center gap-1">
            <ShareSite />
            <LanguageSelect />
            <ThemeToggleButton className="size-8 rounded-full text-muted-foreground" />
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
          listClassName="h-9 w-max justify-start gap-0.5 bg-transparent p-0"
          highlightClassName="rounded-lg bg-primary/10 shadow-none ring-0"
          triggerClassName="h-9 flex-none rounded-lg border-0 px-2 text-[13px] text-muted-foreground hover:bg-accent/50 aria-selected:font-semibold aria-selected:text-primary"
          renderList={(list) => (
            <nav
              ref={navRef}
              className="app-nav"
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
                className="site-home-link flex size-9 shrink-0 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
              >
                <img src="/icon.svg" alt="" width="32" height="32" />
              </Link>
              {mobile ? (
                <ScrollArea className="nav-tabs-scroll">
                  {list}
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              ) : (
                <DesktopNavigation activeRoute={activeRoute} />
              )}
              <div className="desktop-preferences flex items-center gap-1">
                <ShareSite />
                <LanguageSelect />
                <ThemeToggleButton className="size-9 shrink-0 rounded-lg text-muted-foreground" />
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
                      <p className="status-line">
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
        <footer className="app-footer">
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
              className="inline-flex items-center gap-1 align-middle"
            >
              GitHub
            </a>
          </UnderlineHover>{" "}
          ·{" "}
          <UnderlineHover asChild>
            <a href="mailto:ip@huzhihui.com">{t("policy.contactAuthor")}</a>
          </UnderlineHover>{" "}
          ·{" "}
          <UnderlineHover asChild>
            <a href="https://ipbot.net">IPBot</a>
          </UnderlineHover>
        </footer>
      </div>
      <aside
        aria-label={t("navigation.notifications")}
        className="update-notices"
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
