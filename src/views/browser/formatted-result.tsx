import { useState } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { fieldLabel, valueText, hasResultValue } from "./result-format";

function Value({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (
    typeof value === "string" &&
    /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value)
  )
    return (
      <img
        className="max-h-48 max-w-full rounded bg-white object-contain"
        src={value}
        alt={t("本次检测生成的绘图样本")}
      />
    );
  if (value === null || typeof value !== "object")
    return (
      <span className="break-words [overflow-wrap:anywhere]">
        {valueText(value)}
      </span>
    );
  const entries = Object.entries(value).filter(([, child]) =>
    hasResultValue(child),
  );
  if (!entries.length)
    return (
      <span className="text-muted-foreground">
        {Array.isArray(value) ? t("空列表（0 项）") : t("无记录（0 项）")}
      </span>
    );
  if (
    Array.isArray(value) &&
    value.every((item) => typeof item !== "object" || item === null)
  )
    return (
      <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
        {value.map((item, index) => (
          <span
            key={index}
            className="rounded bg-muted px-2 py-1 text-xs break-all"
          >
            {valueText(item)}
          </span>
        ))}
      </div>
    );
  if (depth >= 4)
    return (
      <pre className="whitespace-pre-wrap break-all text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  return (
    <div className="min-w-0">
      {entries.map(([key, child]) => (
        <div
          key={key}
          className="flex min-w-0 flex-wrap items-start gap-x-4 gap-y-1 border-b border-border/50 py-2 last:border-0"
        >
          <div
            className="max-w-full grow text-sm break-words text-muted-foreground"
            title={key}
          >
            {Array.isArray(value)
              ? t("第 {0} 项", [Number(key) + 1])
              : fieldLabel(key)}
          </div>
          <div
            className={
              child !== null &&
              typeof child === "object" &&
              !Array.isArray(child)
                ? "w-full min-w-0 text-sm"
                : "w-max max-w-full flex-none text-sm font-medium"
            }
          >
            <Value value={child} depth={depth + 1} />
          </div>
        </div>
      ))}
    </div>
  );
}
export function FormattedResult({
  value,
  hash,
}: {
  value: unknown;
  hash?: string;
}) {
  const [raw, setRaw] = useState(false);
  if (!hasResultValue(value)) return null;
  return (
    <div className="min-w-0 space-y-3">
      {hash && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border/50 py-2">
          <p
            className="grow text-sm text-muted-foreground"
            title={t("用于比较，不是检测分数")}
          >
            {t("指纹摘要")}
          </p>
          <p className="max-w-full flex-none break-all font-mono text-xs">
            {hash}
          </p>
        </div>
      )}
      <Button size="sm" variant="outline" onClick={() => setRaw(!raw)}>
        {raw ? t("返回格式化结果") : t("查看原始 JSON")}
      </Button>
      {raw ? (
        <pre className="rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap break-all">
          {JSON.stringify(value, null, 2) ?? t("未提供")}
        </pre>
      ) : (
        <Value value={value} />
      )}
    </div>
  );
}
