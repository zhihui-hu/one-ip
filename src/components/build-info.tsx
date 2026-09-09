import { useEffect } from "react";
import { format, isValid, parseISO } from "date-fns";
import { name, version } from "../../package.json";

let printed = false;

/** Build metadata is console-only, never part of the page layout. */
export function BuildInfo() {
  useEffect(() => {
    if (printed) return;
    printed = true;
    const date = parseISO(import.meta.env.VITE_BUILD_TIME ?? "");
    const buildTime = isValid(date)
      ? format(date, "yyyy-MM-dd HH:mm:ss xxx")
      : "未知";
    const print = (key: string, value: string) =>
      console.log(
        `%c ${key} %c ${value} %c `,
        "background:#20232a ; padding: 1px; border-radius: 3px 0 0 3px;  color: #fff",
        "background:#61dafb ;padding: 1px; border-radius: 0 3px 3px 0;  color: #20232a; font-weight: bold;",
        "background:transparent",
      );
    print(name, version);
    print("build time", buildTime);
    const variables = Object.entries(import.meta.env)
      .filter(([key]) => key !== "VITE_BUILD_TIME")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => ({ key, value: String(value) }));
    console.groupCollapsed("Environment variables (public)");
    console.table(variables);
    console.groupEnd();
  }, []);
  return null;
}
