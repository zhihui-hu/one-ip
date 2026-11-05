import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AnimatedValue } from "@/components/animated-value";
import { CompactText } from "@/components/compact-text";
import { NumberTicker } from "@/components/number-ticker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SweepShine } from "@/components/ui/sweep-shine";
import { Switch } from "@/components/ui/switch";
import { UnderlineHover } from "@/components/underline-hover";
import { t } from "@/i18n";
import { maskedIp } from "@/lib/network";
import { hideIpAtom } from "@/store/privacy";
import { useAtom, useAtomValue } from "jotai";
import { Eye, EyeOff } from "lucide-react";

export function PageHeading({
  title,
  privacy = false,
}: {
  title: string;
  privacy?: boolean;
}) {
  useEffect(() => {
    document.title = `${title}`;
  }, [title]);
  return (
    <>
      <h1 className="sr-only">{title}</h1>
      {privacy && (
        <div className="page-privacy">
          <PrivacyToggle />
        </div>
      )}
    </>
  );
}
export function PrivacyToggle({ iconOnly = false }: { iconOnly?: boolean }) {
  const [hidden, setHidden] = useAtom(hideIpAtom);
  if (iconOnly) {
    const label = hidden
      ? t("common.showIpAddresses")
      : t("common.hideIpAddresses");
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 rounded-full text-muted-foreground md:size-9 md:rounded-lg"
        aria-label={label}
        title={label}
        aria-pressed={hidden}
        onClick={() => setHidden((value) => !value)}
      >
        {hidden ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </Button>
    );
  }
  return (
    <label className="privacy-toggle">
      <span>{t("common.hideIp")}</span>
      <Switch
        aria-label={t("common.hideIpAddresses")}
        checked={hidden}
        onCheckedChange={setHidden}
      />
    </label>
  );
}
export function IpText({ ip, link = true }: { ip?: string; link?: boolean }) {
  const hidden = useAtomValue(hideIpAtom);
  if (!ip) return <span className="muted">{t("common.unknown")}</span>;
  const text = maskedIp(ip, hidden);
  const content = <CompactText text={text} middle tooltip={false} />;
  return (
    <span className="ip-text">
      <AnimatedValue value={ip}>
        {link && !hidden ? (
          <UnderlineHover asChild>
            <Link to={`/lookup/ip/${encodeURIComponent(ip)}`}>{content}</Link>
          </UnderlineHover>
        ) : (
          content
        )}
      </AnimatedValue>
    </span>
  );
}
export function ToolCard({
  title,
  children,
  className = "",
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`tool-card ${className}`}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
export function Facts({
  rows,
  renderLabel,
}: {
  rows: [string, ReactNode][];
  renderLabel?: (label: string) => ReactNode;
}) {
  return (
    <dl className="facts">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{renderLabel ? renderLabel(label) : label}</dt>
          <dd>
            <AnimatedValue
              value={
                typeof value === "string" || typeof value === "number"
                  ? value
                  : undefined
              }
            >
              {typeof value === "number" ? (
                <NumberTicker value={value} />
              ) : (
                (value ?? t("common.unknown"))
              )}
            </AnimatedValue>
          </dd>
        </div>
      ))}
    </dl>
  );
}
export function Pending({
  children = t("common.checking"),
}: {
  children?: ReactNode;
}) {
  return <SweepShine role="status">{children}</SweepShine>;
}
export function ErrorNotice({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <Alert variant="destructive" className="error-notice">
      <AlertDescription>
        <AnimatedValue
          value={error instanceof Error ? error.message : String(error)}
        >
          {error instanceof Error ? error.message : String(error)}
        </AnimatedValue>
      </AlertDescription>
    </Alert>
  );
}
export function ActionButton({
  busy,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { busy?: boolean }) {
  return (
    <Button
      {...props}
      disabled={busy || props.disabled}
      aria-busy={busy}
      className={`action-button ${props.className ?? ""}`}
    >
      {busy ? (
        <Pending>
          <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
            {children}
          </span>
        </Pending>
      ) : (
        children
      )}
    </Button>
  );
}
export function ReadingLinks({
  links,
  title = t("common.furtherReadingLabel"),
}: {
  links: { path: string; title: string }[];
  title?: string;
}) {
  return (
    <section className="reading">
      <h2>{title}</h2>
      <div className="reading-grid">
        {links.map((item) => (
          <UnderlineHover asChild key={item.path}>
            <Link to={item.path}>{item.title}</Link>
          </UnderlineHover>
        ))}
      </div>
    </section>
  );
}
