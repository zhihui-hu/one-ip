import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import NProgress from "nprogress";

export function RouteProgress() {
  const { key } = useLocation();
  const previousKey = useRef(key);

  useLayoutEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    NProgress.configure({
      showSpinner: false,
      barSelector: '[role="progressbar"]',
      trickle: !reducedMotion,
      speed: reducedMotion ? 0 : 200,
      template:
        '<div class="bar" role="progressbar" aria-label="页面切换"><div class="peg"></div></div>',
    });
    return () => {
      NProgress.done();
      NProgress.remove();
    };
  }, []);

  useLayoutEffect(() => {
    // Eager routes are committed synchronously. Show transition feedback before paint,
    // with a short minimum display time rather than pretending to track a request.
    if (previousKey.current === key) return;
    previousKey.current = key;
    NProgress.start();
    const timer = window.setTimeout(() => NProgress.done(), 180);
    // A new navigation cancels the old completion timer and extends the current bar.
    return () => window.clearTimeout(timer);
  }, [key]);

  return null;
}
