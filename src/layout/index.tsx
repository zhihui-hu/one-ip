import { lazy, Suspense, useEffect, useRef } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { AuthorContact } from "@/components/author-contact";
import { GithubLink, repositoryUrl } from "@/components/github-link";
import { HomePageSkeleton } from "@/components/home-page-skeleton";
import { IpSearch } from "@/components/ip-search";
import { LanguageSelect } from "@/components/language-select";
import { AppUpdateChecker } from "@/components/providers/app-update-checker";
import { ThemeToggleButton } from "@/components/theme/theme-toggle-button";
import { Pending, PrivacyToggle } from "@/components/toolkit";
import { UnderlineHover } from "@/components/underline-hover";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/use-theme";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { HomeShortcuts } from "@/views/home/components/home-shortcuts";
import { Toaster } from "sonner";
import { RouteErrorBoundary } from "./route-error-boundary";

// Console-only metadata; keep date-fns out of the entry chunk.
const BuildInfo = lazy(() =>
  import("@/components/build-info").then((m) => ({ default: m.BuildInfo })),
);
const currentYear = new Date().getFullYear();

/** App-wide card defaults (every card rendered inside the layout). */
const containerCardClass =
  "[&_[data-slot=card]]:mt-2 [&_[data-slot=card]]:border-0 [&_[data-slot=card]]:[box-shadow:none] [&_[data-slot=card]]:[--card-spacing:12px]";
const navClass = cn(
  "hidden",
  // Desktop: floating pill that gains a surface once the page scrolls.
  // The negative margin cancels the padding and 1px border, so the logo and
  // buttons line up with the page content while the pill keeps its inset.
  "md:sticky md:top-2 md:z-40 md:mb-3 md:flex md:min-h-11 md:items-center md:justify-between md:gap-6 md:rounded-[999px] md:border md:border-transparent md:bg-transparent md:-mx-3 md:py-1 md:px-[11px] md:transition-[background-color,border-color,box-shadow] md:duration-200 md:ease-[ease]",
  "md:data-[scrolled=true]:border-[color-mix(in_srgb,var(--border)_70%,transparent)] md:data-[scrolled=true]:bg-[color-mix(in_srgb,var(--card)_88%,transparent)] md:data-[scrolled=true]:[box-shadow:0_8px_24px_-10px_color-mix(in_srgb,var(--foreground)_20%,transparent),0_1px_3px_color-mix(in_srgb,var(--foreground)_6%,transparent)] md:data-[scrolled=true]:backdrop-blur-[16px] md:data-[scrolled=true]:backdrop-saturate-[1.4]",
);

/** Header icon buttons are uniform regardless of each button's own variant. */
const headerActionsClass =
  "flex items-center gap-1 [&>:is(button,a)]:size-8! [&>:is(button,a)]:rounded-lg! [&>:is(button,a)]:border-border! [&>:is(button,a)]:bg-card! [&>:is(button,a)]:p-0! [&>:is(button,a)]:text-muted-foreground! [&>:is(button,a)]:hover:bg-muted! [&>:is(button,a)]:hover:text-foreground! [&>[data-ip-search]]:w-auto! [&>[data-ip-search]]:px-2!";

export function AppLayout() {
  const { resolvedTheme } = useTheme();
  const mobile = useIsMobile();
  const { pathname } = useLocation();
  const navRef = useRef<HTMLElement>(null);

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
  }, [pathname]);

  return (
    <>
      <div
        className={cn(
          "mx-auto w-full max-w-[1000px] px-5 py-4 max-xs:px-3 max-xs:pt-2.5",
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
            <GithubLink />
          </div>
        </header>
        <nav
          ref={navRef}
          className={navClass}
          aria-label={t("navigation.main")}
        >
          <Link
            to="/"
            aria-label={t("navigation.siteTitle")}
            className="flex h-11 shrink-0 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
          >
            <img
              src="/icon.svg"
              alt=""
              width="32"
              height="32"
              className="size-6"
            />
          </Link>
          <div className={cn(headerActionsClass, "md:gap-1.5")}>
            {!mobile && <IpSearch />}
            <PrivacyToggle iconOnly />
            <LanguageSelect />
            <ThemeToggleButton className="size-9 shrink-0 rounded-lg text-muted-foreground" />
            <GithubLink />
          </div>
        </nav>
        <main className="outline-none">
          <RouteErrorBoundary key={pathname}>
            <Suspense
              fallback={
                pathname === "/" ? (
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
        <div className="mt-4">
          <HomeShortcuts />
        </div>
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
            <Link to="/terms">{t("policy.terms")}</Link>
          </UnderlineHover>{" "}
          ·{" "}
          <UnderlineHover asChild>
            <Link to="/privacy">{t("policy.privacy")}</Link>
          </UnderlineHover>{" "}
          ·{" "}
          <UnderlineHover asChild>
            <a
              href={repositoryUrl}
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
        className="fixed right-4 bottom-4 z-50 w-[min(23rem,calc(100%-32px))] "
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
