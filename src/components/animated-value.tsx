import { useLayoutEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { gsap } from "gsap";

export function AnimatedValue({
  value,
  children,
  className,
}: {
  value: unknown;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        ref.current,
        { opacity: 0.45, y: 3 },
        { opacity: 1, y: 0, duration: 0.22, clearProps: "opacity,transform" },
      );
    });
    return () => media.revert();
  }, [value]);
  return (
    <span
      ref={ref}
      className={cn("inline-block max-w-full min-w-0 align-bottom", className)}
    >
      {children}
    </span>
  );
}
