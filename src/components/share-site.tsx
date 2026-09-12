import { lazy, Suspense, useState } from "react";
import { t } from "@/i18n";
import { QrCode } from "lucide-react";
import { Button } from "./ui/button";

const ShareSiteDialog = lazy(() => import("./share-site-dialog"));

export function ShareSite() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-full text-muted-foreground md:size-9 md:rounded-lg"
        aria-label={t("分享网站")}
        title={t("分享网站")}
        onClick={() => setOpen(true)}
      >
        <QrCode className="size-4" aria-hidden="true" />
      </Button>
      {open && (
        <Suspense fallback={null}>
          <ShareSiteDialog open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  );
}
