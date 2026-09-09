import { useSyncExternalStore } from "react";
import { themeAtom, type Theme } from "@/store/theme";
import { useAtom } from "jotai";

const query = "(prefers-color-scheme: dark)";
function subscribe(callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function useTheme() {
  const [theme, updateTheme] = useAtom(themeAtom);
  const isDark = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
  const systemTheme = isDark ? "dark" : "light";
  const resolvedTheme = theme === "system" ? systemTheme : theme;
  const setTheme = (next: Theme) => {
    // Apply synchronously so View Transitions capture the new appearance.
    const resolved = next === "system" ? systemTheme : next;
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.style.colorScheme = resolved;
    updateTheme(next);
  };
  return { theme, setTheme, systemTheme, resolvedTheme };
}
