import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const headClass = "min-w-0 truncate";

export function CompactText({
  text,
  middle = false,
  tooltip = true,
  className,
}: {
  text: string;
  middle?: boolean;
  tooltip?: boolean;
  className?: string;
}) {
  const content = (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 align-bottom whitespace-nowrap",
        className,
      )}
      tabIndex={tooltip ? 0 : undefined}
      aria-label={text}
    >
      {middle && text.length > 20 ? (
        <>
          <span className={headClass}>{text.slice(0, -8)}</span>
          <span className="flex-none">{text.slice(-8)}</span>
        </>
      ) : (
        <span className={headClass}>{text}</span>
      )}
    </span>
  );
  if (!tooltip) return content;
  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent
          className="max-w-[min(32rem,90vw)] break-all"
          sideOffset={6}
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
