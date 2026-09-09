import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Globe2 } from "lucide-react";

export function CountryFlag({ code }: { code?: string }) {
  const country =
    code && /^[a-z]{2}$/i.test(code) ? code.toLowerCase() : undefined;
  return (
    <Avatar
      className="country-flag rounded-sm after:hidden"
      aria-label={country?.toUpperCase() ?? "未知地区"}
    >
      <AvatarImage
        src={country ? `https://flagcdn.com/w40/${country}.png` : undefined}
        alt={country?.toUpperCase() ?? ""}
        className="rounded-none object-contain"
        referrerPolicy="no-referrer"
      />
      <AvatarFallback className="rounded-none bg-transparent">
        <Globe2 className="size-3.5 text-muted-foreground" />
      </AvatarFallback>
    </Avatar>
  );
}
