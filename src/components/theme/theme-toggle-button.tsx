import { useEffect, useRef, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { flushSync } from "react-dom";

type ThemeTransition = {
  ready: Promise<void>;
  finished: Promise<void>;
  skipTransition: () => void;
};
type TransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ThemeTransition;
};

export function ThemeToggleButton({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const busy = useRef(false);
  const transitionRef = useRef<ThemeTransition | null>(null);
  const animationRef = useRef<Animation | null>(null);
  const buttonLabel =
    label ?? (resolvedTheme === "dark" ? "切换为浅色模式" : "切换为深色模式");

  useEffect(
    () => () => {
      animationRef.current?.cancel();
      transitionRef.current?.skipTransition();
    },
    [],
  );

  async function handleToggle(event: MouseEvent<HTMLButtonElement>) {
    if (busy.current) return;
    const nextTheme = document.documentElement.classList.contains("dark")
      ? "light"
      : "dark";
    const updateTheme = () => flushSync(() => setTheme(nextTheme));
    const transitionDocument = document as TransitionDocument;
    if (
      !transitionDocument.startViewTransition ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      updateTheme();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    // Keyboard activation expands from the button center; pointer activation uses the exact click.
    const x = event.detail === 0 ? rect.left + rect.width / 2 : event.clientX;
    const y = event.detail === 0 ? rect.top + rect.height / 2 : event.clientY;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );
    busy.current = true;
    try {
      const transition = transitionDocument.startViewTransition(updateTheme);
      transitionRef.current = transition;
      await transition.ready;
      // Reveal the NEW theme outwards in both directions, never shrink the old theme.
      const animation = document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 420,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          fill: "both",
          pseudoElement: "::view-transition-new(root)",
        },
      );
      animationRef.current = animation;
      await animation.finished;
      await transition.finished;
    } catch {
      transitionRef.current?.skipTransition();
      // Unsupported pseudo-element animations still complete the theme change.
      if (
        document.documentElement.classList.contains("dark") !==
        (nextTheme === "dark")
      )
        updateTheme();
    } finally {
      animationRef.current = null;
      transitionRef.current = null;
      busy.current = false;
    }
  }

  return (
    <Button
      type="button"
      aria-label={buttonLabel}
      title={buttonLabel}
      className={cn("shrink-0 rounded-lg shadow-none", className)}
      onClick={(event) => void handleToggle(event)}
      size="icon-sm"
      variant="ghost"
    >
      <Moon aria-hidden="true" className="dark:hidden" />
      <Sun aria-hidden="true" className="hidden dark:block" />
    </Button>
  );
}
