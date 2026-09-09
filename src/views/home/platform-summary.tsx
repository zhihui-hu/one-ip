import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SiteLogo } from "@/components/site-logo";
import { Pending } from "@/components/toolkit";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UnderlineHover } from "@/components/underline-hover";
import { useSortAnimation } from "@/hooks/use-sort-animation";
import { t } from "@/i18n";
import { aiPlatforms } from "@/views/ai/platforms";
import { probeAiDomain } from "@/views/ai/probe";
import { getStatus } from "@/views/status/api";
import { statusOrder } from "@/views/status/order";
import rawservices from "@/views/status/services.json";
import { useQueries } from "@tanstack/react-query";

const featured = ["9", "4", "10", "5", "0", "19", "15", "1"].map((id) =>
  services.find((service) => service.id === id)!,
);
const statusLabels: Record<string, string> = {
  none: t("正常运行"),
  minor: t("轻微故障"),
  major: t("严重故障"),
  critical: t("重大故障"),
  maintenance: t("维护中"),
};
export function PlatformSummary() {
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
  const connectivity = useQueries({
    queries: aiPlatforms.map((platform) => ({
      queryKey: ["ai-preview", "v3", platform.id],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        probeAiDomain(platform.domain, signal),
      enabled: visible,
      staleTime: 120_000,
      retry: false,
      refetchOnWindowFocus: false,
    })),
  });
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
  const orderedPlatforms = aiPlatforms.map((platform, index) => ({
    platform,
    query: connectivity[index],
  }));
  if (
    connectivity.every(
      (query) => !query.isFetching && (query.isSuccess || query.isError),
    )
  )
    orderedPlatforms.sort((a, b) => {
      const left = a.query.data?.median ?? Infinity;
      const right = b.query.data?.median ?? Infinity;
      return (
        Number(Boolean(b.platform.traceDomain)) -
          Number(Boolean(a.platform.traceDomain)) || left - right
      );
    });
  const sortRef = useSortAnimation(
    orderedPlatforms.map(({ platform }) => platform.id).join("|"),
  );
  return (
    <div ref={ref} className="grid grid-cols-1 gap-3 mb-3 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t("AI 访问概览")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={sortRef}
            className="grid grid-cols-2 gap-x-3 md:grid-cols-1 lg:grid-cols-2"
          >
            {orderedPlatforms.map(({ platform, query }) => {
              const latency = query.data?.median;
              return (
                <div
                  key={platform.id}
                  data-sort-id={platform.id}
                  className="flex min-w-0 items-center justify-between gap-2 py-2 text-xs"
                >
                  <UnderlineHover asChild>
                    <Link
                      to={`/ai/${platform.id}`}
                      className="flex min-w-0 items-center gap-2 text-primary"
                      style={{ display: "flex" }}
                    >
                      <SiteLogo website={`https://${platform.domain}`} />
                      <span className="truncate">{platform.name}</span>
                    </Link>
                  </UnderlineHover>
                  <span
                    className="home-metric shrink-0"
                    title={query.data?.description}
                    style={{
                      color: query.isPending
                        ? "var(--muted-foreground)"
                        : latency == null || latency < 0
                          ? "var(--muted-foreground)"
                          : latency < 100
                            ? "var(--success)"
                            : latency < 400
                              ? "var(--good)"
                              : "var(--warning)",
                    }}
                  >
                    {query.isPending ? (
                      <Pending>{t("待检测")}</Pending>
                    ) : latency == null || latency < 0 ? (
                      query.data?.status === "restricted" ? (
                        t("检测受限")
                      ) : (
                        t("未确认")
                      )
                    ) : (
                      `${latency} ms`
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="home-note mt-3">
            {t(
              "显示探测资源的 HTTP 响应耗时；检测受限或未确认不代表网站打不开。点击平台可查看说明并打开官网。",
            )}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="row-between">
            <CardTitle>{t("服务状态")}</CardTitle>
            <UnderlineHover asChild>
              <Link to="/status" className="small text-primary">
                {t("全部服务 ›")}
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
                  statusOrder(a.query.data?.status?.indicator) -
                  statusOrder(b.query.data?.status?.indicator),
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
                        className="flex min-w-0 items-center gap-2 text-primary"
                        style={{ display: "flex" }}
                      >
                        <SiteLogo src={service.icon} website={service.page} />
                        <span className="truncate">
                          {service.name.replace(" (Anthropic)", "")}
                        </span>
                      </Link>
                    </UnderlineHover>
                    <span
                      className="home-metric shrink-0"
                      style={{
                        color: !indicator
                          ? "var(--muted-foreground)"
                          : indicator === "none"
                            ? "var(--success)"
                            : "var(--danger)",
                      }}
                    >
                      {query.isPending ? (
                        <Pending>{t("查询中")}</Pending>
                      ) : (
                        (statusLabels[indicator ?? ""] ?? t("待确认"))
                      )}
                    </span>
                  </div>
                );
              })}
          </div>
          <p className="home-note mt-3">
            {t("来自官方状态源；点击服务查看组件与事件。")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

const services = rawservices.map((item) => ({
  ...item,
  name: t(item.name),
  note: item.note ? t(item.note) : item.note,
}));
