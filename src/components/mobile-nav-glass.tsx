import { useSyncExternalStore } from "react";
import { LiquidGlass } from "react-liquid-glass-svg";

const preference = "(prefers-reduced-transparency: reduce)";
function subscribe(callback: () => void) {
  const media = window.matchMedia(preference);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export default function MobileNavGlass({ light }: { light: boolean }) {
  const reduced = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(preference).matches,
    () => false,
  );
  if (reduced) return null;
  return (
    <LiquidGlass
      className="mobile-nav-glass"
      aria-hidden="true"
      backdropBlur={20}
      tintColor={light ? "rgba(255,255,255,0.72)" : "rgba(22,27,34,0.78)"}
      displacementScale={light ? 12 : 16}
      turbulenceBaseFrequency={0.008}
      glassBorder={false}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        borderRadius: "inherit",
        pointerEvents: "none",
        boxShadow: light
          ? "0 5px 18px rgb(25 45 65 / 14%), inset 0 0 0 1px rgb(255 255 255 / 65%)"
          : "0 5px 20px rgb(0 0 0 / 28%), inset 0 0 0 1px rgb(255 255 255 / 12%)",
      }}
    />
  );
}
