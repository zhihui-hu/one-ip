import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Globe2 } from "lucide-react";

export function SiteLogo({ src, website }: { src?: string; website?: string }) {
  const hostname = website ? new URL(website).hostname : undefined;
  const iconHost =
    hostname === "api.openai.com"
      ? "openai.com"
      : hostname === "chat.deepseek.com"
        ? "www.deepseek.com"
        : hostname === "www.githubstatus.com" || hostname === "githubstatus.com"
          ? "github.com"
          : hostname;
  const icon =
    src ??
    (iconHost ? `https://icons.duckduckgo.com/ip3/${iconHost}.ico` : undefined);
  const githubIcon =
    iconHost === "github.com" ||
    /\/github\.com\.ico(?:[?#]|$)/.test(icon ?? "");
  return (
    <Avatar className="site-icon rounded-sm after:hidden" aria-hidden="true">
      <AvatarImage
        src={icon}
        alt=""
        referrerPolicy="no-referrer"
        className={`rounded-sm object-contain${githubIcon ? " dark:brightness-0 dark:invert" : ""}`}
      />
      <AvatarFallback className="rounded-sm">
        <Globe2 className="size-3.5" />
      </AvatarFallback>
    </Avatar>
  );
}
