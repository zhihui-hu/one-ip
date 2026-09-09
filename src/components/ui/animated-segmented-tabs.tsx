import * as React from "react";
import { cn } from "@/lib/utils";
import { gsap } from "gsap";
import { Tabs as TabsPrimitive } from "radix-ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

export type AnimatedSegmentedTabsOption<TValue extends string = string> = {
  label: React.ReactNode;
  tooltip?: React.ReactNode;
  value: TValue;
  disabled?: boolean;
};

type AnimatedSegmentedTabsProps<TValue extends string = string> = Omit<
  React.ComponentProps<typeof TabsPrimitive.Root>,
  "onValueChange" | "value"
> & {
  label: string;
  options: readonly AnimatedSegmentedTabsOption<TValue>[];
  value: TValue;
  onValueChange: (value: TValue) => void;
  listClassName?: string;
  triggerClassName?: string;
  highlightClassName?: string;
};

export function AnimatedSegmentedTabs<TValue extends string = string>({
  label,
  options,
  value,
  onValueChange,
  children,
  className,
  listClassName,
  triggerClassName,
  highlightClassName,
  ...props
}: AnimatedSegmentedTabsProps<TValue>) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const highlightRef = React.useRef<HTMLSpanElement>(null);
  const triggerRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const valueRef = React.useRef(value);
  const hasMeasuredRef = React.useRef(false);
  const optionValues = React.useMemo(
    () => options.map((option) => option.value).join("\u0000"),
    [options],
  );

  React.useLayoutEffect(() => {
    valueRef.current = value;
  }, [value]);

  const setTriggerRef = React.useCallback(
    (optionValue: string) => (node: HTMLButtonElement | null) => {
      if (node) {
        triggerRefs.current.set(optionValue, node);
        return;
      }
      triggerRefs.current.delete(optionValue);
    },
    [],
  );

  const moveHighlight = React.useCallback(
    (nextValue: string, animate: boolean) => {
      const list = listRef.current;
      const highlight = highlightRef.current;
      const activeTrigger = triggerRefs.current.get(nextValue);

      if (!list || !highlight) return;
      if (!activeTrigger) {
        gsap.killTweensOf(highlight);
        gsap.set(highlight, { opacity: 0 });
        hasMeasuredRef.current = false;
        return;
      }

      const nextState = {
        x: activeTrigger.offsetLeft,
        y: activeTrigger.offsetTop,
        width: activeTrigger.offsetWidth,
        height: activeTrigger.offsetHeight,
        opacity: 1,
      };

      gsap.killTweensOf(highlight);
      if (!animate || !hasMeasuredRef.current || prefersReducedMotion()) {
        gsap.set(highlight, nextState);
        hasMeasuredRef.current = true;
        return;
      }

      gsap.to(highlight, {
        ...nextState,
        duration: 0.24,
        ease: "power3.out",
      });
    },
    [],
  );

  React.useLayoutEffect(() => {
    moveHighlight(value, true);
  }, [moveHighlight, optionValues, value]);

  React.useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }

    const observer = new ResizeObserver(() =>
      moveHighlight(valueRef.current, false),
    );
    observer.observe(list);
    triggerRefs.current.forEach((trigger) => observer.observe(trigger));

    return () => observer.disconnect();
  }, [moveHighlight, optionValues]);

  React.useEffect(() => {
    const highlight = highlightRef.current;

    return () => {
      if (highlight) {
        gsap.killTweensOf(highlight);
      }
    };
  }, []);

  return (
    <TabsPrimitive.Root
      data-slot="animated-segmented-tabs"
      value={value}
      onValueChange={(nextValue) => {
        const option = options.find((item) => item.value === nextValue);
        if (option) {
          onValueChange(option.value);
        }
      }}
      className={cn("shrink-0", className)}
      {...props}
    >
      <TabsPrimitive.List
        ref={listRef}
        aria-label={label}
        data-slot="animated-segmented-tabs-list"
        className={cn(
          "relative inline-flex h-8 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground",
          listClassName,
        )}
      >
        <span
          ref={highlightRef}
          aria-hidden="true"
          data-slot="animated-segmented-tabs-highlight"
          className={cn(
            "pointer-events-none absolute left-0 top-0 z-0 rounded-md bg-background opacity-0 shadow-sm ring-1 ring-foreground/5 will-change-transform",
            highlightClassName,
          )}
        />
        <TooltipProvider>
          {options.map((option) => {
            const trigger = (
              <TabsPrimitive.Trigger
                key={option.value}
                ref={setTriggerRef(option.value)}
                value={option.value}
                disabled={option.disabled}
                data-slot="animated-segmented-tabs-trigger"
                className={cn(
                  "relative z-10 inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-colors outline-none hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 data-[state=active]:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                  triggerClassName,
                )}
              >
                {option.label}
              </TabsPrimitive.Trigger>
            );

            if (!option.tooltip) {
              return trigger;
            }

            return (
              <Tooltip key={option.value}>
                <TooltipTrigger asChild>{trigger}</TooltipTrigger>
                <TooltipContent side="top" sideOffset={6}>
                  {option.tooltip}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </TabsPrimitive.List>
      {children}
    </TabsPrimitive.Root>
  );
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
