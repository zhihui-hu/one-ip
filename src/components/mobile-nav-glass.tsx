import { useSyncExternalStore } from "react";
import LiquidGlass from "liquid-glass-react";

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
    <div className="mobile-nav-glass" aria-hidden="true">
      <LiquidGlass
        className="mobile-glass-surface"
        overLight={false}
        displacementScale={light ? 18 : 24}
        blurAmount={light ? 0.45 : 0.3}
        saturation={125}
        aberrationIntensity={0.35}
        elasticity={0}
        cornerRadius={26}
        padding="0"
        mode="standard"
        style={{ position: "absolute", top: "50%", left: "50%", width: "100%" }}
      >
        <div style={{ height: 66, width: "100%" }} />
      </LiquidGlass>
    </div>
  );
}
