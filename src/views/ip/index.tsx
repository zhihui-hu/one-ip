import { useLayoutEffect, useRef, useState, useId } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { LookupForm } from "@/components/lookup-form";
import { IpText, ErrorNotice, Pending } from "@/components/toolkit";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLookupHistory } from "@/hooks/use-lookup-history";
import { t } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import { gsap } from "gsap";
import { Search, X } from "lucide-react";
import { lookupIpWithFallback } from "./api";
import type { CoffeeLookup } from "./coffee";
import { IpDetails } from "./details";
import { dossierTopClass } from "./styles";

export default function IpPage() {
  const { ip = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const history = useLookupHistory<CoffeeLookup>("ip-tools:coffee-history:v1");
  const cached = history.find(ip);
  const query = useQuery({
    queryKey: ["lookup-ip-coffee", ip],
    enabled: !!ip,
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.savedAt,
    staleTime: 300_000,
    retry: false,
    queryFn: async ({ signal }) => {
      const result = await lookupIpWithFallback(ip, signal);
      // Degraded results must not replace a full cached lookup.
      if (!result.fallback) history.save(ip, result);
      return result;
    },
  });
  const [searchOpen, setSearchOpen] = useState(true);
  const searchPanel = useRef<HTMLDivElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const searchId = useId();
  const hasResult = Boolean(query.data);
  useLayoutEffect(() => {
    const panel = searchPanel.current;
    if (!panel) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const tween = gsap.to(panel, {
      height: searchOpen ? "auto" : 0,
      opacity: searchOpen ? 1 : 0,
      duration: reduced ? 0 : 0.25,
      ease: "power2.out",
      overwrite: true,
      onComplete: () => {
        if (searchOpen) panel.querySelector("input")?.focus();
      },
    });
    return () => {
      tween.kill();
    };
  }, [searchOpen, hasResult]);
  const searchToggle = (
    <Button
      ref={searchButton}
      type="button"
      variant="ghost"
      size="icon"
      className="ml-auto size-8 shrink-0 text-primary"
      aria-label={searchOpen ? t("ip.collapseSearch") : t("ip.expandSearch")}
      aria-expanded={searchOpen}
      aria-controls={searchId}
      onClick={() => setSearchOpen((open) => !open)}
    >
      {searchOpen ? <X className="size-4" /> : <Search className="size-4" />}
    </Button>
  );
  const search = (
    <div
      ref={searchPanel}
      id={searchId}
      aria-hidden={!searchOpen}
      inert={!searchOpen}
      style={{ height: 0, opacity: 0, overflow: "hidden" }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setSearchOpen(false);
          searchButton.current?.focus();
        }
      }}
    >
      <div className="pt-2">
        <LookupForm
          grouped
          value={ip}
          placeholder={t("ip.enterAnIpv4OrIpv6Address")}
          busy={query.isFetching}
          onSubmit={(value) =>
            value === ip
              ? void query.refetch()
              : navigate({
                  pathname: `/ip/${encodeURIComponent(value)}`,
                  search: location.search,
                })
          }
        />
      </div>
    </div>
  );
  const recent = (
    <div className="flex items-center gap-3 pt-2">
      <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-x-auto text-[11px] whitespace-nowrap text-muted-foreground [scrollbar-width:none] max-md:gap-2">
        <span className="max-md:shrink-0">
          {history.entries.length
            ? t("common.recentLookups")
            : t("common.suggestedLookups")}
        </span>
        {(history.entries.length
          ? history.entries.map((entry) => entry.query)
          : ["1.1.1.1", "8.8.8.8", "223.5.5.5"]
        )
          .slice(0, 6)
          .map((value) => (
            <button
              key={value}
              type="button"
              className="cursor-pointer border-0 px-1 py-0.5 text-foreground max-md:min-h-8 max-md:px-1.5 max-md:py-1"
              onClick={() =>
                value === ip
                  ? void query.refetch()
                  : navigate({
                      pathname: `/ip/${encodeURIComponent(value)}`,
                      search: location.search,
                    })
              }
            >
              <IpText ip={value} link={false} />
            </button>
          ))}
      </div>
      {searchToggle}
    </div>
  );
  return (
    <div className="max-md:min-w-0 max-md:max-w-full [&_[data-slot=input-group]]:![border:0] [&_[data-slot=input-group]]:!bg-muted [&_[data-slot=input-group]]:![box-shadow:none]">
      <h1 className="sr-only">{t("common.ipLookup")}</h1>
      <ErrorNotice error={query.error} />
      {query.data?.fallback && !query.isFetching && (
        <Alert className="my-4">
          <AlertDescription>
            {t("ip.primarySourceUnavailableNotice")}
          </AlertDescription>
        </Alert>
      )}
      {query.isFetching && (
        <p
          className="py-5 text-center text-[0.88rem] leading-[1.8] text-muted-foreground"
          role="status"
        >
          <Pending>{t("common.lookingUpEllipsis")}</Pending>
        </p>
      )}
      {query.data ? (
        <IpDetails
          key={query.data.coffee.ip}
          data={query.data}
          search={search}
          recent={recent}
        />
      ) : (
        <div className={`${dossierTopClass} bg-card`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">
              {t("common.ipLookup")}
            </span>
          </div>
          {search}
          {recent}
        </div>
      )}
    </div>
  );
}
