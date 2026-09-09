import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
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
import { useAtom, useAtomValue } from "jotai";

export function PageHeading({
  title,
  description,
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
    <header className="page-heading">
      <h1>{title}</h1>
      <div className="description-row">
        <p>{description}</p>
        {privacy && <PrivacyToggle />}
      </div>
    </header>
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
      <Link to={`/ip/${encodeURIComponent(ip)}`}>{text}</Link>
    </UnderlineHover>
  ) : (
    <span>{text}</span>
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
          <dd>{value ?? "未知"}</dd>
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
        {error instanceof Error ? error.message : String(error)}
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
      {busy ? <Pending>{children}</Pending> : children}
    </Button>
  );
}
export function DataTable<T>({
  data,
  columns,
  empty = "暂无数据",
  className = "",
}: {
  data: T[];
  columns: ColumnDef<T>[];
  empty?: ReactNode;
  className?: string;
}) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
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
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
}: {
  links: { path: string; title: string }[];
}) {
  return (
    <section className="reading">
      <h2>📖 拓展阅读</h2>
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
