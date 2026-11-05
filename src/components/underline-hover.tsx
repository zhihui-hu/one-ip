import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";

export function UnderlineHover({
  asChild = false,
  className,
  ...props
}: ComponentProps<"span"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";
  return (
    <Comp
      className={cn(
        "relative inline-block max-w-full no-underline",
        "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-right after:bg-current after:transition-[transform] after:duration-200 after:ease-[ease] after:content-[''] after:transform-[scaleX(0)] motion-reduce:after:transition-none",
        "hover:after:origin-left hover:after:transform-[scaleX(1)] focus-visible:after:origin-left focus-visible:after:transform-[scaleX(1)]",
        className,
      )}
      // The home page's hover-underline rule skips these links.
      data-underline-hover=""
      {...props}
    />
  );
}
