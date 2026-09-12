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

export function PageHeading({
  title,
  privacy = false,
}: {
  title: string;
  description: string;
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
export function PrivacyToggle() {
  const [hidden, setHidden] = useAtom(hideIpAtom);
  return (
    <label className="privacy-toggle">
      <span>{t("隐藏IP")}</span>
      <Switch
        aria-label={t("隐藏 IP 地址")}
        checked={hidden}
        onCheckedChange={setHidden}
      />
    </label>
  );
}
export function IpText({ ip, link = true }: { ip?: string; link?: boolean }) {
  const hidden = useAtomValue(hideIpAtom);
  if (!ip) return <span className="muted">{t("未知")}</span>;
  const text = maskedIp(ip, hidden);
  return link && !hidden ? (
    <UnderlineHover asChild>
      <Link className="ip-text" to={`/network/ip/${encodeURIComponent(ip)}`}>
        <AnimatedValue value={text}>
          <CompactText text={text} middle />
        </AnimatedValue>
      </Link>
    </UnderlineHover>
  ) : (
    <span className="ip-text">
      <AnimatedValue value={text}>
        <CompactText text={text} middle />
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
                (value ?? t("未知"))
              )}
            </AnimatedValue>
          </dd>
        </div>
      ))}
    </dl>
  );
}
export function Pending({ children = t("检测中…") }: { children?: ReactNode }) {
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
  title = t("拓展阅读"),
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
