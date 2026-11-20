import { Badge } from "@/components/ui/badge";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { locale, t } from "@/i18n";
import { localizeApiMessage } from "@/i18n/api-message";
import { serviceGroupLabel } from "../groups";
import { componentLabels, indicatorLabels, type StatusRow } from "../rows";

export function ServiceDetailDialog({
  detail,
  open,
  onClose,
}: {
  detail?: StatusRow;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <ResponsiveDialog
      title={t("status.namedServiceDetails", [
        detail?.name ?? t("status.service"),
      ])}
      description={
        detail?.loading
          ? t("status.checkingServiceStatus")
          : (detail?.error ??
            detail?.note ??
            (detail?.data?.status?.description
              ? localizeApiMessage(detail.data.status.description)
              : t("status.noDescription")))
      }
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      {detail && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">
            {!detail.integrated
              ? t("status.notIntegrated")
              : detail.failed
                ? t(detail.data ? "status.updateFailed" : "status.lookupFailed")
                : (indicatorLabels[detail.data?.status?.indicator ?? ""] ??
                  t("common.unknown"))}
          </Badge>
          {detail.failed && detail.data && (
            <span>
              {t("status.lastKnownStatus", [
                indicatorLabels[detail.data.status?.indicator ?? ""] ??
                  t("common.unknown"),
              ])}
            </span>
          )}
          <span>{serviceGroupLabel(detail.group)}</span>
          {detail.data?.checkedAt && (
            <time dateTime={detail.data.checkedAt}>
              {t("status.sourceCheckedAt", [
                new Date(detail.data.checkedAt).toLocaleString(locale),
              ])}
            </time>
          )}
          {detail.data?.fetchedAt && (
            <time dateTime={detail.data.fetchedAt}>
              {t("status.lastSuccessfulUpdate", [
                new Date(detail.data.fetchedAt).toLocaleString(locale),
              ])}
            </time>
          )}
        </div>
      )}
      {!!detail?.data?.components?.length && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">
            {t("status.serviceComponents")}
          </h3>
          <dl className="divide-y divide-border text-sm">
            {detail.data.components.map((component) => (
              <div
                key={component.id}
                className="flex items-center justify-between gap-4 py-2"
              >
                <dt className="min-w-0 break-words">{component.name}</dt>
                <dd className="shrink-0 text-muted-foreground">
                  {componentLabels[component.status] ?? component.status}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <h3 className="text-sm font-medium">{t("status.currentIncidents")}</h3>
      {!detail?.loading &&
        !detail?.error &&
        detail?.data &&
        Array.isArray(detail.data.incidents) &&
        !detail.data.incidents.length && (
          <p className="text-sm text-muted-foreground">
            {t("status.theSourceReportedNoCurrentIncidents")}
          </p>
        )}
      {detail?.data && !detail.data.incidents && (
        <p className="text-sm text-muted-foreground">
          {t("status.sourceProvidesAggregateStatusSeeSourcePageIncident")}
        </p>
      )}
      {detail?.data?.incidents?.map((incident) => (
        <section
          key={incident.id}
          className="space-y-2 rounded-lg bg-muted/50 p-3"
        >
          <h3 className="font-medium">{incident.name}</h3>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{incident.status}</Badge>
            {incident.updated_at && (
              <time>
                {new Date(incident.updated_at).toLocaleString(locale)}
              </time>
            )}
          </div>
        </section>
      ))}
      {detail && (
        <a
          className="text-sm underline underline-offset-4"
          href={detail.page}
          target="_blank"
          rel="noreferrer"
        >
          {detail.officialStatus
            ? t("status.viewOfficialStatusPage")
            : t("status.visitPlatformWebsite")}
        </a>
      )}
    </ResponsiveDialog>
  );
}
