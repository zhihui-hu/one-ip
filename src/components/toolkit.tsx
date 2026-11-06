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
import { cn } from "@/lib/utils";
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
        <div className="mb-2 flex items-center justify-end">
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
    <label className="inline-flex shrink-0 items-center gap-[7px] pt-0.5 text-[0.75rem] whitespace-nowrap text-muted-foreground [&_[data-slot=switch]]:h-[18px]! [&_[data-slot=switch]]:w-8! [&_[data-slot=switch-thumb]]:size-3.5!">
      <span>{t("common.hideIp")}</span>
      <Switch
        aria-label={t("common.hideIpAddresses")}
        checked={hidden}
        onCheckedChange={setHidden}
      />
    </label>
  );
}
export function IpText({
  ip,
  link = true,
  newTab = false,
  className,
}: {
  ip?: string;
  link?: boolean;
  /** Open the IP detail page in a new browser tab. */
  newTab?: boolean;
  className?: string;
}) {
  const hidden = useAtomValue(hideIpAtom);
  if (!ip)
    return <span className="text-muted-foreground">{t("common.unknown")}</span>;
  const text = maskedIp(ip, hidden);
  const content = <CompactText text={text} middle tooltip={false} />;
  return (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 whitespace-nowrap",
        className,
      )}
    >
      <AnimatedValue value={ip}>
        {link && !hidden ? (
          <UnderlineHover asChild>
            <Link
              to={`/ip/${encodeURIComponent(ip)}`}
              {...(newTab && { target: "_blank", rel: "noopener" })}
            >
              {content}
            </Link>
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
    <Card className={cn("min-w-0", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
type FactsClass = string | ((label: string) => string | undefined);
export function Facts({
  rows,
  renderLabel,
  className,
  rowClassName,
  labelClassName,
  valueClassName,
}: {
  rows: [string, ReactNode][];
  renderLabel?: (label: string) => ReactNode;
  className?: string;
  /** Per-row classes; a function receives the row label. */
  rowClassName?: FactsClass;
  labelClassName?: FactsClass;
  valueClassName?: FactsClass;
}) {
  const resolve = (value: FactsClass | undefined, label: string) =>
    typeof value === "function" ? value(label) : value;
  return (
    <dl className={className}>
      {rows.map(([label, value]) => (
        <div
          key={label}
          className={cn(
            "flex min-h-9 items-center justify-between gap-3 border-b border-border py-1.5 text-[0.85rem] last:border-b-0",
            resolve(rowClassName, label),
          )}
        >
          <dt
            className={cn(
              "shrink-0 text-muted-foreground",
              resolve(labelClassName, label),
            )}
          >
            {renderLabel ? renderLabel(label) : label}
          </dt>
          <dd
            className={cn(
              "min-w-0 text-right font-semibold wrap-anywhere",
              resolve(valueClassName, label),
            )}
          >
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
    <Alert variant="destructive" className="my-4">
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
      className={cn(
        "min-w-[90px] [&>[role=status]]:inline-flex [&>[role=status]]:items-center",
        props.className,
      )}
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
