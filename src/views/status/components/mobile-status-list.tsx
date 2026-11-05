import { SiteLogo } from "@/components/site-logo";
import { Card, CardContent } from "@/components/ui/card";
import { locale, t } from "@/i18n";
import { cn } from "@/lib/utils";
import { indicatorLabels, type ServiceWithQuery } from "../rows";
import { serviceColor, serviceSurface } from "../service-tone";

export function MobileStatusList({
  sections,
  setDetailId,
}: {
  sections: readonly (readonly [string, ServiceWithQuery[]])[];
  setDetailId: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {sections.map(
        ([label, items]) =>
          items.length > 0 && (
            <Card key={label}>
              <CardContent>
                <h2 className="mb-1 text-xs font-medium text-muted-foreground">
                  {label} · {items.length}
                </h2>
                <div className="divide-y divide-border/50">
                  {items.map((service) => {
                    const indicator = service.query.data?.status?.indicator;
                    const incident = service.query.data?.incidents?.[0];
                    const tone = service.query.isError
                      ? "unknown"
                      : (indicator ?? "unknown");
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => setDetailId(service.id)}
                        className="block w-full py-3 text-left"
                        aria-label={t("common.viewDetails", [service.name])}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                            <SiteLogo
                              src={service.icon}
                              website={service.page}
                            />
                            <span className="truncate">
                              {service.name.replace(" (Anthropic)", "")}
                            </span>
                          </span>
                          <span
                            title={service.query.error?.message}
                            className={cn(
                              "shrink-0 text-xs max-md:bg-transparent max-md:text-(--service-color)",
                              serviceColor(tone),
                              serviceSurface(tone),
                            )}
                          >
                            {service.query.isFetching && !service.query.data
                              ? t("common.lookingUpLabel")
                              : !service.url
                                ? t("status.notIntegrated")
                                : service.query.isError
                                  ? t(
                                      service.query.data
                                        ? "status.updateFailed"
                                        : "status.lookupFailed",
                                    )
                                  : (indicatorLabels[indicator ?? ""] ??
                                    t("common.pendingConfirmation"))}
                          </span>
                        </span>
                        {service.query.isError && service.query.data && (
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {t("status.lastKnownStatus", [
                              indicatorLabels[indicator ?? ""] ??
                                t("common.unknown"),
                            ])}
                          </span>
                        )}
                        {service.query.data?.fetchedAt && (
                          <time
                            dateTime={service.query.data.fetchedAt}
                            className="mt-1 block text-xs text-muted-foreground"
                          >
                            {t("status.lastSuccessfulUpdate", [
                              new Date(
                                service.query.data.fetchedAt,
                              ).toLocaleString(locale),
                            ])}
                          </time>
                        )}
                        {service.query.isError && (
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {service.query.error?.message}
                          </span>
                        )}
                        {incident && (
                          <span className="mt-1 block truncate text-xs text-muted-foreground">
                            {incident.name}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ),
      )}
    </div>
  );
}
