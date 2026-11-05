// Utility bundles shared by the route topology and announcement charts.
export const graphWrapClass =
  "max-w-full min-w-0 overflow-x-auto overscroll-x-contain [scrollbar-width:thin]";
export const graphSvgClass =
  "block h-auto w-full min-w-[720px] overflow-visible max-md:min-w-[680px]";
export const columnLabelClass =
  "fill-muted-foreground font-sans text-[10px] font-medium";
export const edgeClass = (tier1?: boolean) =>
  `fill-none [stroke-linecap:round] ${tier1 ? "stroke-info-text/72" : "stroke-muted-foreground/52"}`;
