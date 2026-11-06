import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { t } from "@/i18n";
import { normalizeIp } from "@/lib/ip-address";
import { ArrowRight, Search } from "lucide-react";

export function IpSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [ip, setIp] = useState("");
  const address = normalizeIp(ip);
  const options = ip.trim()
    ? address
      ? [address]
      : []
    : ["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"];
  const mac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== "k" ||
        !(event.ctrlKey || event.metaKey) ||
        event.altKey
      )
        return;
      event.preventDefault();
      if (!event.repeat) setOpen((value) => !value);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
  const lookup = (value: string) => {
    setOpen(false);
    setIp("");
    navigate({
      pathname: `/ip/${encodeURIComponent(value)}`,
      search: location.search,
    });
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) setIp("");
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          data-ip-search=""
          className="h-8 gap-1.5 rounded-lg text-muted-foreground"
          aria-label={t("home.searchIp")}
          aria-keyshortcuts="Control+k Meta+k"
          title={`${t("home.searchIp")} (${mac ? "⌘K" : "Ctrl+K"})`}
        >
          <Search className="size-4" aria-hidden="true" />
          <kbd
            className="hidden font-sans text-[10px] md:inline-flex"
            aria-hidden="true"
          >
            {mac ? "⌘ K" : "Ctrl K"}
          </kbd>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="top-[20%] -translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{t("home.searchIp")}</DialogTitle>
          <DialogDescription>{t("home.searchIpDescription")}</DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false} loop label={t("home.searchIp")}>
          <CommandInput
            autoFocus
            aria-label={t("home.enterIp")}
            placeholder={t("home.enterIp")}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={ip}
            onValueChange={setIp}
          />
          <CommandList>
            <CommandEmpty>{t("home.enterValidIp")}</CommandEmpty>
            <CommandGroup
              heading={!ip.trim() ? t("common.suggestedLookups") : undefined}
            >
              {options.map((value) => (
                <CommandItem
                  key={value}
                  value={value}
                  onSelect={() => lookup(value)}
                >
                  <Search aria-hidden="true" />
                  <span className="min-w-0 flex-1 break-all">{value}</span>
                  <ArrowRight aria-hidden="true" />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <p className="border-t px-3 py-2 text-xs text-muted-foreground">
          {t("home.searchIpDescription")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
