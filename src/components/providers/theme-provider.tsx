import { useLayoutEffect, type PropsWithChildren } from "react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeProvider({ children }: PropsWithChildren) {
  const { resolvedTheme } = useTheme();
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);
  return children;
}
