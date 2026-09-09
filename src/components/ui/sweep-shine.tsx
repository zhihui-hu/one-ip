import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";

type SweepShineProps = ComponentProps<"span"> & {
  active?: boolean;
  asChild?: boolean;
  variant?: "surface" | "text";
};

export function SweepShine({
  active = true,
  asChild = false,
  className,
  variant = "text",
  ...props
}: SweepShineProps) {
  const Comp = asChild ? Slot.Root : "span";
  return (
    <Comp
      data-slot="sweep-shine"
      data-variant={variant}
      className={cn(
        active &&
          (variant === "surface" ? "sweep-shine-surface" : "sweep-shine"),
        className,
      )}
      {...props}
    />
  );
}
