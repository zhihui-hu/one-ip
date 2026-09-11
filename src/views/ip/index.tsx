import { useLayoutEffect, useRef, useState, useId } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LookupForm } from "@/components/lookup-form";
import { IpText, ErrorNotice, Pending } from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { useLookupHistory } from "@/hooks/use-lookup-history";
import { t } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import { gsap } from "gsap";
import { Search, X } from "lucide-react";
import { lookupIp } from "./api";
import type { CoffeeLookup } from "./coffee";
import { IpDetails } from "./details";

export default function IpPage() {
  const { ip = "" } = useParams();
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
      const result = await lookupIp(ip, signal);
      history.save(ip, result);
      return result;
    },
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const searchPanel = useRef<HTMLDivElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const searchId = useId();
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
  }, [searchOpen, Boolean(query.data)]);
  const searchToggle = (
    <Button
      ref={searchButton}
      type="button"
      variant="ghost"
      size="icon"
      className="size-8 shrink-0 text-primary"
      aria-label={searchOpen ? t("收起搜索") : t("展开搜索")}
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
          placeholder={t("输入 IPv4 或 IPv6 地址")}
          busy={query.isFetching}
          onSubmit={(value) =>
            value === ip
              ? void query.refetch()
              : navigate(`/network/ip/${encodeURIComponent(value)}`)
          }
        />
      </div>
    </div>
  );
  const recent = (
    <div className="ip-recent-row">
      <div className="ip-recent">
        <span>{history.entries.length ? t("最近查询") : t("推荐查询")}</span>
        {(history.entries.length
          ? history.entries.map((entry) => entry.query)
          : ["1.1.1.1", "8.8.8.8", "223.5.5.5"]
        )
          .slice(0, 6)
          .map((value) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                value === ip
                  ? void query.refetch()
                  : navigate(`/network/ip/${encodeURIComponent(value)}`)
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
    <div className="lookup-page ip-detail-page">
      <h1 className="sr-only">{t("IP 信息查询")}</h1>
      <ErrorNotice error={query.error} />
      {query.isFetching && (
        <p className="status-line" role="status">
          <Pending>{t("查询中…")}</Pending>
        </p>
      )}
      {query.data ? (
        <IpDetails data={query.data} search={search} recent={recent} />
      ) : (
        <div className="ip-dossier-top">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{t("IP 信息查询")}</span>
          </div>
          {search}
          {recent}
        </div>
      )}
    </div>
  );
}
