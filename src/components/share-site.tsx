import { lazy, Suspense, useState } from "react";
import { useLocation } from "react-router-dom";
import { t } from "@/i18n";
import { QrCode } from "lucide-react";
import { CopyButton } from "./copy-button";
import { Button } from "./ui/button";
import { InputGroup, InputGroupInput, InputGroupAddon } from "./ui/input-group";
import { ResponsiveDialog } from "./ui/responsive-dialog";

const loadQrCode = () => import("./share-qr-code");
const ShareQrCode = lazy(loadQrCode);

export function ShareSite() {
  const { pathname, search, hash } = useLocation();
  const siteUrl = `${window.location.origin}${pathname}${search}${hash}`;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-full text-muted-foreground md:size-9 md:rounded-lg"
        aria-label={t("share.shareThisPage")}
        title={t("share.shareThisPage")}
        onPointerEnter={() => void loadQrCode()}
        onFocus={() => void loadQrCode()}
        onClick={() => setOpen(true)}
      >
        <QrCode className="size-4" aria-hidden="true" />
      </Button>
      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title={t("share.shareThisPage")}
        description={t("share.scanCopyLinkOpenPage")}
      >
        <div className="space-y-3">
          <div className="flex flex-col items-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_4%,var(--card))] bg-[radial-gradient(color-mix(in_srgb,var(--primary)_12%,transparent)_0.7px,transparent_0.7px)] bg-size-[12px_12px] px-3 py-3">
            <div className="relative w-full max-w-56 rounded-xl bg-white [box-shadow:0_4px_18px_color-mix(in_srgb,var(--primary)_8%,transparent)]">
              <Suspense fallback={<div className="aspect-square w-full" />}>
                <ShareQrCode value={siteUrl} />
              </Suspense>
              <span
                className="pointer-events-none absolute size-6 border-primary left-0 top-0 rounded-tl-xl border-l-2 border-t-2"
                aria-hidden="true"
              />
              <span
                className="pointer-events-none absolute size-6 border-primary right-0 top-0 rounded-tr-xl border-r-2 border-t-2"
                aria-hidden="true"
              />
              <span
                className="pointer-events-none absolute size-6 border-primary bottom-0 left-0 rounded-bl-xl border-b-2 border-l-2"
                aria-hidden="true"
              />
              <span
                className="pointer-events-none absolute size-6 border-primary bottom-0 right-0 rounded-br-xl border-b-2 border-r-2"
                aria-hidden="true"
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t("share.scanToOpenThisPage")}
            </p>
          </div>
          <InputGroup>
            <InputGroupInput
              readOnly
              value={siteUrl}
              aria-label={t("share.currentPageLink")}
              className="h-8 min-w-0 flex-1 text-xs"
              onFocus={(event) => event.currentTarget.select()}
            />
            <InputGroupAddon align="inline-end">
              <CopyButton value={siteUrl} className="size-6 text-primary" />
            </InputGroupAddon>
          </InputGroup>
        </div>
      </ResponsiveDialog>
    </>
  );
}
