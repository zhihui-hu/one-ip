import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SweepShine } from "@/components/ui/sweep-shine";
import { t } from "@/i18n";
import { updatePendingAtom } from "@/store/app-update";
import { useAtom } from "jotai";

export interface UpdateAvailableNoticeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void | Promise<void>;
  title?: string;
  description?: string;
  updateLabel?: string;
  updatingLabel?: string;
  closeLabel?: string;
  resetUpdatingAfterUpdate?: boolean;
}

export function UpdateAvailableNotice({
  open,
  onOpenChange,
  onUpdate,
  title = t("appUpdate.newVersionAvailable"),
  description = t("appUpdate.newVersionReadyUseAfterUpdating"),
  updateLabel = t("appUpdate.updateNow"),
  updatingLabel = t("appUpdate.updating"),
  closeLabel = t("appUpdate.remindLater"),
  resetUpdatingAfterUpdate = false,
}: UpdateAvailableNoticeProps) {
  const [updating, setUpdating] = useAtom(updatePendingAtom);
  const [error, setError] = React.useState<string | null>(null);

  async function handleUpdate() {
    if (updating) return;
    setError(null);
    setUpdating(true);
    try {
      await onUpdate?.();
    } catch {
      setError(t("appUpdate.updateFailedPleaseRetry"));
      setUpdating(false);
    } finally {
      if (resetUpdatingAfterUpdate) {
        setUpdating(false);
      }
    }
  }

  if (!open) return null;

  return (
    <div>
      <Card
        role="alert"
        aria-live="polite"
        aria-atomic="true"
        aria-label={title}
        className="relative animate-in fade-in slide-in-from-bottom-3 bg-card gap-0 rounded-xl border-0 px-3 py-3 shadow-md ring-1 ring-foreground/5 duration-300 motion-reduce:animate-none"
      >
        <div className="grid gap-3">
          <div className="min-w-0">
            <p className="text-sm leading-5 font-semibold">{title}</p>
            <p className="text-muted-foreground mt-0.5 text-xs leading-4">
              {error ?? description}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => onOpenChange(false)}
              disabled={updating}
            >
              {closeLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              onClick={() => void handleUpdate()}
              disabled={updating}
              aria-busy={updating || undefined}
            >
              <SweepShine
                active={updating}
                className={updating ? "text-primary-foreground/70" : undefined}
              >
                {updating ? updatingLabel : updateLabel}
              </SweepShine>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
