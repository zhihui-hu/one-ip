import {
  dataTableCellClass,
  dataTableHeadClass,
  dataTableLeadingClass,
  dataTableTableClass,
} from "@/components/data-table";
import { siteCellClass } from "@/components/site-logo";
import { cn } from "@/lib/utils";

// Utility bundles shared by the scenario and platform access tables,
// layered over the shared DataTable look.
export const tableClass = cn(
  dataTableTableClass,
  dataTableLeadingClass,
  "min-w-0 table-fixed",
);
const cellPadding =
  "px-2.5 py-2 max-md:px-[5px] max-md:py-2 max-md:text-[0.75rem] max-sm:px-1.5 max-sm:text-[11px]";
export const tableCellClass = cn(dataTableCellClass, cellPadding);
export const tableHeadClass = cn(dataTableHeadClass, cellPadding);
export const pingDotsClass = "flex gap-[3px] max-md:gap-0.5";
export const platformNameClass = cn(
  siteCellClass,
  "w-full cursor-pointer overflow-hidden text-left focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring max-sm:gap-[5px]",
);
export const platformNameLabelClass = "min-w-0 overflow-hidden text-ellipsis";
