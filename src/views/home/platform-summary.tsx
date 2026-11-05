import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SiteLogo } from "@/components/site-logo";
import { Pending } from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UnderlineHover } from "@/components/underline-hover";
import { t, locale } from "@/i18n";
import { localizeCatalogItem } from "@/lib/localize-catalog";
import { aiPlatforms } from "@/views/ai/platforms";
import { probeAiDomain } from "@/views/ai/probe";
import { getStatus } from "@/views/status/api";
import { statusOrder } from "@/views/status/order";
import rawservices from "@/views/status/services.json";
import { useQueries } from "@tanstack/react-query";
import { Info } from "lucide-react";

const services = rawservices.map(localizeCatalogItem);

const popularAiPlatforms = [
  "gpt",
  "gemini",
  "claude",
  "deepseek",
  "grok",
  "perplexity",
  "qwen",
  "kimi",
].map((id) => aiPlatforms.find((platform) => platform.id === id)!);

const featured = ["9", "4", "10", "5", "0", "19", "15", "1"].map((id) =>
  services.find((service) => service.id === id)!,
);
const statusLabels: Record<string, string> = {
  none: t("common.operational"),
  minor: t("common.minorOutage"),
  major: t("common.majorOutage"),
  critical: t("common.criticalOutage"),
  maintenance: t("common.underMaintenance"),
};
function useSummaryVisibility() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

export function AiAccessSummary() {
  const { ref, visible } = useSummaryVisibility();
  const connectivity = useQueries({
    queries: popularAiPlatforms.map((platform) => ({
      queryKey: ["ai-preview", "v3", platform.id],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        probeAiDomain(platform.domain, signal),
      enabled: visible,
      staleTime: 120_000,
      retry: false,
      refetchOnWindowFocus: false,
    })),
  });
  const orderedPlatforms = popularAiPlatforms.map((platform, index) => ({
    platform,
    query: connectivity[index],
  }));
  return (
    <Card ref={ref}>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          {t("home.aiAccessOverview")}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-5 text-muted-foreground"
                  aria-label={t("common.explain", [t("home.aiAccessOverview")])}
                >
                  <Info className="size-3.5" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                sideOffset={6}
                className="max-w-72 text-xs leading-relaxed"
              >
                {t("home.showsHttpResponseTimeProbeUnreachableMeansProbe")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-6">
          {orderedPlatforms.map(({ platform, query }) => {
            const latency = query.data?.median;
            return (
              <div
                key={platform.id}
                className="flex min-w-0 items-center justify-between gap-2 py-1.5 text-xs"
              >
                <UnderlineHover asChild>
                  <Link
                    to={
                      platform.id === "gpt" || platform.id === "claude"
                        ? `/unlock/${platform.id}`
                        : `/status?service=${platform.statusId}`
                    }
                    className="flex min-w-0 items-center gap-2 text-foreground"
                    style={{ display: "flex" }}
                  >
                    <SiteLogo website={`https://${platform.domain}`} />
                    <span className="truncate">{platform.name}</span>
                  </Link>
                </UnderlineHover>
                <span
                  className="shrink-0 font-[650] tabular-nums max-md:text-[12px]"
                  title={query.data?.description}
                  style={{
                    color: query.isPending
                      ? "var(--muted-foreground)"
                      : latency == null || latency < 0
                        ? "var(--danger)"
                        : latency < 100
                          ? "var(--success)"
                          : latency < 400
                            ? "var(--good)"
                            : "var(--warning)",
                  }}
                >
                  {query.isPending ? (
                    <Pending>{t("common.notChecked")}</Pending>
                  ) : latency == null || latency < 0 ? (
                    query.data?.status === "restricted" ? (
                      t("common.checkRestricted")
                    ) : (
                      t("common.unreachable")
                    )
                  ) : (
                    `${latency} ms`
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function PlatformSummary() {
  const { ref, visible } = useSummaryVisibility();
  const statuses = useQueries({
    queries: featured.map((service) => ({
      queryKey: ["service-status", service.id],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getStatus(service.id, signal),
      enabled: visible,
      staleTime: 120_000,
      retry: false,
      refetchOnWindowFocus: false,
    })),
  });
  return (
    <Card ref={ref}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{t("navigation.serviceStatus")}</CardTitle>
          <UnderlineHover asChild>
            <Link to="/status" className="text-[0.78rem] text-muted-foreground">
              {t("home.allServicesLabel")}
            </Link>
          </UnderlineHover>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-3 md:grid-cols-1 lg:grid-cols-2">
          {featured
            .map((service, index) => ({ service, query: statuses[index] }))
            .sort(
              (a, b) =>
                statusOrder(
                  a.query.isError ? undefined : a.query.data?.status?.indicator,
                ) -
                statusOrder(
                  b.query.isError ? undefined : b.query.data?.status?.indicator,
                ),
            )
            .map(({ service, query }) => {
              const indicator = query.data?.status?.indicator;
              return (
                <div
                  key={service.id}
                  className="flex min-w-0 items-center justify-between gap-2 py-2 text-xs"
                >
                  <UnderlineHover asChild>
                    <Link
                      to={`/status?service=${service.id}`}
                      className="flex min-w-0 items-center gap-2 text-foreground"
                      style={{ display: "flex" }}
                    >
                      <SiteLogo src={service.icon} website={service.page} />
                      <span className="truncate">
                        {service.name.replace(" (Anthropic)", "")}
                      </span>
                    </Link>
                  </UnderlineHover>
                  <span
                    className="flex shrink-0 flex-col items-end gap-0.5 text-right"
                    title={query.error?.message}
                  >
                    <span
                      className="font-[650] tabular-nums max-md:text-[12px]"
                      style={{
                        color: query.isError
                          ? "var(--warning)"
                          : !indicator
                            ? "var(--muted-foreground)"
                            : indicator === "none"
                              ? "var(--success)"
                              : "var(--danger)",
                      }}
                    >
                      {query.isPending ? (
                        <Pending>{t("common.lookingUpLabel")}</Pending>
                      ) : query.isError ? (
                        t(
                          query.data
                            ? "status.updateFailed"
                            : "status.lookupFailed",
                        )
                      ) : (
                        (statusLabels[indicator ?? ""] ??
                        t("common.pendingConfirmation"))
                      )}
                    </span>
                    {query.isError && query.data && (
                      <>
                        <span className="text-[10px] text-muted-foreground">
                          {t("status.lastKnownStatus", [
                            statusLabels[indicator ?? ""] ??
                              t("common.pendingConfirmation"),
                          ])}
                        </span>
                        <time
                          dateTime={query.data.fetchedAt}
                          className="text-[10px] text-muted-foreground"
                          title={t("status.lastSuccessfulUpdate", [
                            new Date(query.data.fetchedAt).toLocaleString(
                              locale,
                            ),
                          ])}
                          aria-label={t("status.lastSuccessfulUpdate", [
                            new Date(query.data.fetchedAt).toLocaleString(
                              locale,
                            ),
                          ])}
                        >
                          {new Date(query.data.fetchedAt).toLocaleTimeString(
                            locale,
                          )}
                        </time>
                      </>
                    )}
                  </span>
                </div>
              );
            })}
        </div>
        <p className="mt-1 text-[11px] leading-[1.6] font-normal text-subtle">
          {t("home.officialStatusSourcesClickServiceComponentsIncidents")}
        </p>
      </CardContent>
    </Card>
  );
}
