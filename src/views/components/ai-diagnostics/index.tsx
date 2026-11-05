import { useEffect } from "react";
import { CountryFlag } from "@/components/country-flag";
import {
  PrivacyToggle,
  PageHeading,
  ToolCard,
  Facts,
  IpText,
  Pending,
} from "@/components/toolkit";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { t, locale } from "@/i18n";
import { AiNetworkCheck } from "@/views/ai/network-check";
import { AiPlatformLinks } from "@/views/ai/platform-links";
import { aiPlatforms } from "@/views/ai/platforms";
import { claudeApi } from "@/views/claude/api";
import { claudeHistoryAtom } from "@/views/claude/store";
import { gptApi } from "@/views/gpt/api";
import { gptHistoryAtom } from "@/views/gpt/store";
import { useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";

export default function AiDiagnostics({ kind }: { kind: "claude" | "gpt" }) {
  const api = kind === "claude" ? claudeApi : gptApi;
  const label = kind === "claude" ? "Claude AI" : "ChatGPT";
  const [history, setHistory] = useAtom(
    kind === "claude" ? claudeHistoryAtom : gptHistoryAtom,
  );
  const domestic = useQuery({
    queryKey: ["domestic-ip"],
    queryFn: ({ signal }) => api.domestic(signal),
    retry: false,
  });
  const cf = useQuery({
    queryKey: ["cf-exit"],
    queryFn: ({ signal }) => api.cloudflare(signal),
    retry: false,
  });
  const exit = useQuery({
    queryKey:
      kind === "claude" ? ["claude-domain-exit", "claude.ai"] : [kind, "exit"],
    staleTime: 60_000,
    queryFn: ({ signal }) => api.exit(signal),
    retry: false,
  });
  const ip = exit.data?.ip;
  const geo = useQuery({
    queryKey: ["geo", ip],
    enabled: !!ip,
    queryFn: ({ signal }) => api.geo(ip!, signal),
    retry: false,
  });
  useEffect(() => {
    if (ip)
      setHistory((previous) =>
        previous[0]?.ip === ip
          ? previous
          : [{ ip, time: new Date().toISOString() }, ...previous].slice(0, 20),
      );
  }, [ip, setHistory]);
  return (
    <div>
      <PageHeading
        title={
          kind === "claude"
            ? t("ai.claudeAiNetworkCheck")
            : t("ai.chatgptCodexNetworkCheck")
        }
      />
      <div className="mb-3 grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-start gap-3 max-sm:grid-cols-1">
        <ToolCard
          title={
            <div className="flex items-center justify-between gap-3">
              <span>
                {label}
                {t("ai.egress")}
              </span>
              <PrivacyToggle />
            </div>
          }
        >
          <div className="mb-1 text-[1.5rem] leading-[1.45] font-bold wrap-anywhere text-primary max-sm:text-[1.2rem]">
            {exit.isPending ? (
              <Pending>{t("ai.checkingEgress")}</Pending>
            ) : (
              <IpText ip={ip} />
            )}
          </div>
          {exit.isError ? (
            <p className="text-[0.78rem] text-muted-foreground">
              {t("ai.egressAddressObtainedPossiblyDueConnectionCrossOrigin")}
            </p>
          ) : geo.isFetching ? (
            <p className="text-[0.78rem] text-muted-foreground">
              <Pending>{t("common.lookingUpLocationDetails")}</Pending>
            </p>
          ) : geo.isError ? (
            <p className="text-[0.78rem] text-muted-foreground">
              {t("ai.locationDetailsAreUnavailable")}
            </p>
          ) : (
            <p className="text-[0.78rem] text-muted-foreground">
              <CountryFlag
                code={geo.data?.country_code ?? exit.data?.country_code}
              />{" "}
              {[geo.data?.country ?? exit.data?.country_code, geo.data?.city]
                .filter(Boolean)
                .join(" · ") || t("ai.unknownLocation")}
            </p>
          )}
          <Facts
            className="mt-3"
            rowClassName="min-h-[30px] border-0 py-1 max-sm:items-baseline"
            valueClassName="max-w-[70%] font-medium"
            rows={[
              [t("ai.isp"), geo.data?.isp],
              ["ASN", geo.data?.asn],
            ]}
          />
          <div className="mt-4 border-t border-border pt-3">
            <span className="text-[0.78rem] text-muted-foreground">
              {t("ai.otherEgressAddresses")}
            </span>
            {[
              { query: domestic, title: t("ai.chinaIpv4") },
              { query: cf, title: "Cloudflare" },
            ].map(({ query, title }) => (
              <div
                className="flex items-baseline justify-between gap-4 pt-2 text-[0.82rem]"
                key={title}
              >
                <span className="shrink-0 text-muted-foreground">{title}</span>
                <span className="min-w-0 text-right">
                  {query.isPending ? (
                    <Pending>{t("common.checking")}</Pending>
                  ) : query.isError ? (
                    <span className="text-muted-foreground">
                      {t("common.unavailable")}
                    </span>
                  ) : (
                    <IpText ip={query.data?.ip} />
                  )}
                </span>
              </div>
            ))}
            {(domestic.isError || cf.isError) && (
              <p className="text-[0.78rem] text-muted-foreground">
                {t(
                  "ai.referenceEgressMayLimitedConnectivityCrossOriginRestrictions",
                )}
              </p>
            )}
          </div>
        </ToolCard>
        <AiNetworkCheck
          domains={
            kind === "claude"
              ? ["claude.ai", "anthropic.com"]
              : ["chatgpt.com", "api.openai.com"]
          }
        >
          <p className="mt-3 text-[0.78rem] text-muted-foreground">
            {t("ai.browserHttpProbesDoIndicateAccountAccessModel")}
          </p>
          <AiPlatformLinks
            platform={aiPlatforms.find((platform) => platform.id === kind)!}
          />
        </AiNetworkCheck>
      </div>
      <Accordion type="multiple" className="rounded-xl bg-card px-4">
        <AccordionItem value="history">
          <AccordionTrigger className="items-center py-3.5">
            <span>
              {t("ai.egressHistory")}{" "}
              <span className="ml-2.5 text-[0.75rem] font-normal text-muted-foreground">
                {history.length}
                {t("ai.entriesThisBrowser")}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.78rem] text-muted-foreground">
                {t("ai.storedBrowserUp20Entries")}
              </p>
              <Button
                variant="ghost"
                size="sm"
                disabled={!history.length}
                onClick={() => setHistory([])}
              >
                {t("ai.clearHistory")}
              </Button>
            </div>
            {history.length ? (
              <div className="mt-3 grid grid-cols-[1fr_1fr] gap-x-6 gap-y-2 text-[0.85rem] max-xs:grid-cols-1">
                {history.map((item) => (
                  <div
                    key={item.time}
                    className="flex flex-wrap justify-between gap-3"
                  >
                    <IpText ip={item.ip} />
                    <time className="text-[0.75rem] text-subtle">
                      {new Date(item.time).toLocaleString(locale)}
                    </time>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[0.78rem] text-muted-foreground">
                {t("ai.noHistory")}
              </p>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
