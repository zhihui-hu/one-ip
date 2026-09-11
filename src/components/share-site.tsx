import { useState } from "react";
import { t } from "@/i18n";
import { QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { CopyButton } from "./copy-button";
import { Button } from "./ui/button";
import { InputGroup, InputGroupInput, InputGroupAddon } from "./ui/input-group";
import { ResponsiveDialog } from "./ui/responsive-dialog";

export function ShareSite() {
  const siteUrl = `${window.location.origin}/`;
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
      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title={t("分享网站")}
        description={t("把实用的网络工具，分享给需要的人。")}
      >
        <div className="space-y-3">
          <div className="share-qr-panel flex flex-col items-center rounded-xl px-3 py-3">
            <div className="share-qr-frame relative w-full max-w-56 rounded-xl bg-white">
              <QRCodeSVG
                value={siteUrl}
                size={224}
                level="M"
                marginSize={4}
                bgColor="#ffffff"
                fgColor="#111827"
                title={t("扫码打开网站")}
                className="block h-auto w-full rounded-xl"
              />
              <span
                className="share-qr-corner left-0 top-0 rounded-tl-xl border-l-2 border-t-2"
                aria-hidden="true"
              />
              <span
                className="share-qr-corner right-0 top-0 rounded-tr-xl border-r-2 border-t-2"
                aria-hidden="true"
              />
              <span
                className="share-qr-corner bottom-0 left-0 rounded-bl-xl border-b-2 border-l-2"
                aria-hidden="true"
              />
              <span
                className="share-qr-corner bottom-0 right-0 rounded-br-xl border-b-2 border-r-2"
                aria-hidden="true"
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t("扫码打开网站")}
            </p>
          </div>
          <InputGroup>
            <InputGroupInput
              readOnly
              value={siteUrl}
              aria-label={t("网站链接")}
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
