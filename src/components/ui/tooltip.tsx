"use client";

import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { t } from "@/i18n";
import { cn } from "cn";
import { Slot, Tooltip as TooltipPrimitive } from "radix-ui";
import { ResponsiveDialog } from "./responsive-dialog";

const MobileTooltip = React.createContext<{
  open: boolean;
  setOpen: (value: boolean) => void;
} | null>(null);

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const mobile = useIsMobile();
  const [open, setOpen] = React.useState(props.defaultOpen ?? false);
  if (mobile)
    return (
      <MobileTooltip.Provider
        value={{
          open: props.open ?? open,
          setOpen: (value) => {
            setOpen(value);
            props.onOpenChange?.(value);
          },
        }}
      >
        {props.children}
      </MobileTooltip.Provider>
    );
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  const mobile = React.useContext(MobileTooltip);
  if (mobile) {
    const { asChild, ...triggerProps } = props;
    const Trigger = asChild ? Slot.Root : "button";
    return (
      <Trigger
        {...triggerProps}
        data-slot="tooltip-trigger"
        aria-haspopup="dialog"
        aria-expanded={mobile.open}
        onClickCapture={(event) => {
          if (triggerProps.disabled) return;
          event.preventDefault();
          event.stopPropagation();
          mobile.setOpen(true);
        }}
        onKeyDown={(event) => {
          if (
            event.currentTarget.tagName !== "BUTTON" &&
            (event.key === "Enter" || event.key === " ")
          ) {
            event.preventDefault();
            mobile.setOpen(true);
          }
        }}
      />
    );
  }
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  const mobile = React.useContext(MobileTooltip);
  if (mobile)
    return (
      <ResponsiveDialog
        open={mobile.open}
        onOpenChange={mobile.setOpen}
        title={t("完整内容")}
        description=""
      >
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
          {children}
        </div>
      </ResponsiveDialog>
    );
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 inline-flex w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs text-background has-data-[slot=kbd]:pr-1.5 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
