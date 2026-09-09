import { useEffect } from "react";
import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import { name, version } from "../../package.json";

const buildTime = import.meta.env.VITE_BUILD_TIME;
const buildDate = parseISO(buildTime ?? "");
const validBuildTime = isValid(buildDate);
const formattedBuildTime = validBuildTime
  ? format(buildDate, "yyyy-MM-dd HH:mm:ss xxx")
  : "未知";
const compactBuildTime = validBuildTime
  ? format(buildDate, "yyyy-MM-dd HH:mm")
  : "未知";
let printed = false;

export function BuildInfo() {
  useEffect(() => {
    // Avoid duplicate logs during Strict Mode effects and route remounts.
    if (printed) return;
    printed = true;

    const print = (key: string, value: string) =>
      console.log(
        `%c ${key} %c ${value} %c `,
        "background:#20232a ; padding: 1px; border-radius: 3px 0 0 3px;  color: #fff",
        "background:#61dafb ;padding: 1px; border-radius: 0 3px 3px 0;  color: #20232a; font-weight: bold;",
        "background:transparent",
      );

    print(name, version);
    print("build time", formattedBuildTime);

    // Only browser-public Vite values belong here. Never expose process.env.
    const variables = Object.entries(import.meta.env)
      .filter(([key]) => key !== "VITE_BUILD_TIME")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => ({ key, value: String(value) }));

    console.groupCollapsed("Environment variables (public)");
    console.table(variables);
    console.groupEnd();
  }, []);

  const relativeTime = validBuildTime
    ? formatDistanceToNow(buildDate, { addSuffix: true, locale: zhCN })
    : "";
  return (
    <section
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground"
      aria-label="构建信息"
    >
      <span className="inline-flex items-center gap-2">
        <span>{name}</span>
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
          v{version}
        </span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span>构建于</span>
        <time
          dateTime={validBuildTime ? buildTime : undefined}
          title={`${formattedBuildTime} ${relativeTime}`}
          className="tabular-nums"
        >
          {compactBuildTime}
        </time>
      </span>
    </section>
  );
}
