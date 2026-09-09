import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function CompactText({
  text,
  middle = false,
}: {
  text: string;
  middle?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="compact-text" tabIndex={0} aria-label={text}>
            {middle && text.length > 20 ? (
              <>
                <span className="compact-text-head">{text.slice(0, -8)}</span>
                <span className="compact-text-tail">{text.slice(-8)}</span>
              </>
            ) : (
              <span className="compact-text-head">{text}</span>
            )}
          </span>
        </TooltipTrigger>
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
