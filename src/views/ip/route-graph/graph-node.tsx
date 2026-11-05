import { NODE_HEIGHT, truncateLabel } from "./layout";

export type GraphNodeKind = {
  origin?: boolean;
  prefix?: boolean;
  tier1?: boolean;
  current?: boolean;
};

const currentFill = "fill-[color-mix(in_srgb,#4ca8ff_14%,var(--card))]";

function rectClass({ origin, prefix, tier1, current }: GraphNodeKind) {
  const fill = prefix
    ? "fill-[color-mix(in_srgb,var(--info-soft)_50%,var(--card))]"
    : current
      ? currentFill
      : origin
        ? "fill-[color-mix(in_srgb,var(--muted)_70%,var(--card))]"
        : tier1
          ? "fill-[color-mix(in_srgb,var(--info-soft)_70%,var(--card))]"
          : "fill-card";
  const stroke = prefix
    ? "stroke-info-text"
    : current
      ? "stroke-[#4ca8ff]"
      : tier1
        ? "stroke-info-text"
        : "stroke-border";
  return `${fill} ${stroke} ${current ? "stroke-2" : "stroke-1"}`;
}

export function GraphNode({
  x,
  y,
  width,
  eyebrow,
  title,
  ...kind
}: {
  x: number;
  y: number;
  width: number;
  eyebrow: string;
  title: string;
} & GraphNodeKind) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect
        width={width}
        height={NODE_HEIGHT}
        rx="8"
        className={rectClass(kind)}
      />
      <text
        x="12"
        y="19"
        className="fill-foreground font-sans text-[12px] font-[650]"
      >
        {truncateLabel(eyebrow, 25)}
      </text>
      <text
        x="12"
        y="36"
        className="fill-muted-foreground font-sans text-[11px]"
      >
        {truncateLabel(title, width < 190 ? 24 : 28)}
      </text>
    </g>
  );
}
