import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";

export function UnderlineHover({
  asChild = false,
  className,
  ...props
}: ComponentProps<"span"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";
  return <Comp className={cn("underline-hover", className)} {...props} />;
}
