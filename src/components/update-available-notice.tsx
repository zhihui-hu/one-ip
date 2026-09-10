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
        className="relative animate-in fade-in slide-in-from-bottom-3 bg-card gap-0 rounded-xl border-0 px-3 py-3 shadow-md ring-1 ring-foreground/5 duration-300 motion-reduce:animate-none"
      >
        <div className="relative pr-32">
          <div className="min-w-0">
            <p className="text-sm leading-5 font-semibold">{title}</p>
            <p className="text-muted-foreground mt-0.5 text-xs leading-4">
              {error ?? description}
            </p>
          </div>
          <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-1">
            <Button
              type="button"
              size="sm"
              className="h-7 px-2.5 text-xs"
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
              className="size-7 text-muted-foreground/60 hover:text-muted-foreground"
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
