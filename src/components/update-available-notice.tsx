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
        className="relative animate-in fade-in slide-in-from-bottom-3 bg-card gap-0 rounded-xl border-0 p-4 shadow-md ring-1 ring-foreground/5 duration-300 motion-reduce:animate-none"
      >
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <p className="pr-7 text-sm leading-5 font-semibold">{title}</p>
            <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
              {error ?? description}
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              className="h-8 min-w-24 px-4"
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
              className="absolute right-2 top-2 text-muted-foreground/60 hover:text-muted-foreground"
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
