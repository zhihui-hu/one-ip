import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AnimatedValue } from "@/components/animated-value";
import { CompactText } from "@/components/compact-text";
import { NumberTicker } from "@/components/number-ticker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SweepShine } from "@/components/ui/sweep-shine";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { UnderlineHover } from "@/components/underline-hover";
import { maskedIp } from "@/lib/network";
import { hideIpAtom } from "@/store/privacy";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { gsap } from "gsap";
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
    document.title = `${title} - Net.Coffee 复刻版`;
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
      <span>隐藏IP</span>
      <Switch
        aria-label="隐藏 IP 地址"
        checked={hidden}
        onCheckedChange={setHidden}
      />
    </label>
  );
}
export function IpText({ ip, link = true }: { ip?: string; link?: boolean }) {
  const hidden = useAtomValue(hideIpAtom);
  if (!ip) return <span className="muted">未知</span>;
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
export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="facts">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
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
                (value ?? "未知")
              )}
            </AnimatedValue>
          </dd>
        </div>
      ))}
    </dl>
  );
}
export function Pending({ children = "检测中…" }: { children?: ReactNode }) {
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
export function DataTable<T>({
  data,
  columns,
  empty = "暂无数据",
  className = "",
  getRowId,
  getRowClassName,
  animateChanges = true,
  animateSorting = false,
  animateEntries = false,
}: {
  data: T[];
  columns: ColumnDef<T>[];
  empty?: ReactNode;
  className?: string;
  getRowId?: (row: T) => string;
  getRowClassName?: (row: T) => string;
  animateChanges?: boolean;
  animateSorting?: boolean;
  animateEntries?: boolean;
}) {
  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
  });
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const positions = useRef(new Map<string, number>());
  const order = table
    .getRowModel()
    .rows.map((row) => row.id)
    .join("\0");
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body || (!animateSorting && !animateEntries)) return;
    const next = new Map<string, number>();
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    for (const row of Array.from(body.rows)) {
      const id = row.dataset.rowId;
      if (!id) continue;
      const top = row.offsetTop;
      const previous = positions.current.get(id);
      const offset =
        previous == null
          ? 0
          : previous - top + Number(gsap.getProperty(row, "y"));
      gsap.killTweensOf(row);
      next.set(id, top);
      if (!reduced && previous == null && animateEntries) {
        gsap.fromTo(
          row,
          { opacity: 0, y: 8 },
          {
            opacity: 1,
            y: 0,
            duration: 0.3,
            ease: "power2.out",
            clearProps: "opacity,transform",
          },
        );
      } else if (!reduced && offset && animateSorting) {
        gsap.fromTo(
          row,
          { y: offset },
          {
            y: 0,
            duration: 0.4,
            ease: "power2.inOut",
            clearProps: "transform",
            overwrite: true,
          },
        );
      } else gsap.set(row, { clearProps: "transform" });
    }
    positions.current = next;
  }, [order, animateSorting, animateEntries]);
  useEffect(() => {
    const body = bodyRef.current;
    return () => {
      if (body) gsap.killTweensOf(Array.from(body.rows));
    };
  }, []);
  return (
    <div className={`data-table ${className}`}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody ref={bodyRef}>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-row-id={row.id}
              className={getRowClassName?.(row.original)}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {animateChanges ? (
                    <AnimatedValue value={JSON.stringify(row.original)}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </AnimatedValue>
                  ) : (
                    flexRender(cell.column.columnDef.cell, cell.getContext())
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {!data.length && (
            <TableRow>
              <TableCell colSpan={columns.length} className="empty-cell">
                {empty}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
export function ReadingLinks({
  links,
  title = "拓展阅读",
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
