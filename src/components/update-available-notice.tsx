import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SweepShine } from "@/components/ui/sweep-shine";
import { t } from "@/i18n";
import { updatePendingAtom } from "@/store/app-update";
import { useAtom } from "jotai";
import { X } from "lucide-react";

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
  title = t("发现新版本"),
  description = t("新版本已经准备好，更新后即可使用。"),
  updateLabel = t("更新"),
  updatingLabel = t("正在更新…"),
  closeLabel = t("关闭更新提示"),
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
      setError(t("更新失败，请重试。"));
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
        className="animate-in fade-in slide-in-from-bottom-3 bg-card gap-0 rounded-lg border-0 p-3 shadow-sm ring-0 duration-300 motion-reduce:animate-none"
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-5 font-medium">{title}</p>
            <p className="text-muted-foreground mt-1 text-xs leading-4">
              {error ?? description}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              size="sm"
              className="min-w-24"
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
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground/60 hover:text-muted-foreground"
              onClick={() => onOpenChange(false)}
              disabled={updating}
              aria-label={closeLabel}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
