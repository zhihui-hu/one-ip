import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { AnimatedValue } from "@/components/animated-value";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { flexRender, type RowData } from "@tanstack/react-table";
import {
  getCoreRowModel,
  useLegacyTable,
  type LegacyColumnDef as ColumnDef,
} from "@tanstack/react-table/legacy";
import { gsap } from "gsap";

// Shared table look, also used by tables that render their own markup.
// (`border-current` mirrors the old `border: 0` resets on zero-width sides.)
// Base styles sit on the elements themselves so page wrappers can override
// them with `[&_td]:` / `[&_th]:` variants (higher specificity).
export const dataTableClass =
  "overflow-hidden rounded-[8px] border-0 border-current shadow-none";
/** For a raw `<table>`; the shadcn `Table` also needs `dataTableLeadingClass`. */
export const dataTableTableClass =
  "w-full border-separate border-spacing-0 text-[0.9rem] max-xs:text-[0.78rem]";
/** Keeps shadcn `text-sm` line-height after the font-size override. */
export const dataTableLeadingClass = "leading-[calc(1.25/0.875)]";
export const dataTableHeaderClass = "border-0 border-current [&_tr]:border-0";
export const dataTableHeadClass =
  "h-auto border-b-0 border-b-current bg-muted px-4 py-2.5 text-left text-[0.85em] font-semibold text-muted-foreground max-md:px-2.5 max-md:py-[9px]";
export const dataTableCellClass =
  "border-b-0 border-b-current px-4 py-2.5 whitespace-normal wrap-anywhere max-md:px-2.5 max-md:py-[9px]";
export const dataTableRowClass =
  "border-0 border-current even:bg-muted hover:bg-accent";

export function DataTable<T extends RowData>({
  data,
  columns,
  empty = t("common.noData"),
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
  const table = useLegacyTable({
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
        // An interrupted entry tween must not leave the row transparent.
        gsap.set(row, { clearProps: "opacity" });
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
      } else gsap.set(row, { clearProps: "opacity,transform" });
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
    <div
      className={cn(
        dataTableClass,
        // Empty-state cell; `[data-empty]` matches the former `.data-table .empty-cell` weight.
        "[&_[data-empty]]:p-7 [&_[data-empty]]:text-center [&_[data-empty]]:text-subtle",
        className,
      )}
    >
      <Table className={cn(dataTableTableClass, dataTableLeadingClass)}>
        <TableHeader className={dataTableHeaderClass}>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="border-0 border-current">
              {group.headers.map((header) => (
                <TableHead key={header.id} className={dataTableHeadClass}>
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
              className={cn(dataTableRowClass, getRowClassName?.(row.original))}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className={dataTableCellClass}>
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
            <TableRow className={dataTableRowClass}>
              <TableCell
                colSpan={columns.length}
                className={dataTableCellClass}
                data-empty=""
              >
                {empty}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
