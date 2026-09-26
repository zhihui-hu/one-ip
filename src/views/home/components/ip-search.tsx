import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { t } from "@/i18n";
import { Search } from "lucide-react";

export function IpSearch() {
  const navigate = useNavigate();
  const [ip, setIp] = useState("");
  return (
    <form
      className="w-36 shrink-0 sm:w-44"
      onSubmit={(event) => {
        event.preventDefault();
        const value = ip.trim();
        if (value) navigate(`/network/ip/${encodeURIComponent(value)}`);
      }}
    >
      <InputGroup className="h-7 border-border/50 bg-muted/20 text-muted-foreground shadow-none focus-within:border-border/70 dark:bg-muted/10">
        <InputGroupInput
          aria-label={t("输入 IP")}
          autoCapitalize="none"
          autoCorrect="off"
          className="text-xs placeholder:text-muted-foreground/60"
          placeholder={t("输入 IP")}
          spellCheck={false}
          value={ip}
          onChange={(event) => setIp(event.target.value)}
        />
        <InputGroupAddon align="inline-end" className="pr-1.5">
          <InputGroupButton
            type="submit"
            size="icon-xs"
            aria-label={t("查询")}
            title={t("查询")}
            className="text-muted-foreground hover:text-foreground"
          >
            <Search className="size-3.5" aria-hidden="true" />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
