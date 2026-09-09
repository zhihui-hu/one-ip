import { useState } from "react";
import { ResponsiveDialog } from "./ui/responsive-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { UnderlineHover } from "./underline-hover";

export function DetailText({
  text,
  title = "完整内容",
}: {
  text: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TooltipProvider delayDuration={250}>
        <Tooltip>
          <TooltipTrigger asChild>
            <UnderlineHover asChild>
              <button
                type="button"
                className="block min-w-0 max-w-full truncate text-left text-primary"
                onClick={() => setOpen(true)}
                aria-label={text}
              >
                {text}
              </button>
            </UnderlineHover>
          </TooltipTrigger>
          <TooltipContent className="max-w-[min(32rem,90vw)] break-all">
            {text}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description="完整内容"
      >
        <p className="whitespace-pre-wrap break-all">{text}</p>
      </ResponsiveDialog>
    </>
  );
}
