import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { AnimatedValue } from "@/components/animated-value";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { t } from "@/i18n";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { gsap } from "gsap";

export function DataTable<T>({
  data,
  columns,
  empty = t("暂无数据"),
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
