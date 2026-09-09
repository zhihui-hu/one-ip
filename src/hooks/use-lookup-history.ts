import { useCallback, useState } from "react";

type Entry<T> = { query: string; data: T; savedAt: number };

export function useLookupHistory<T>(key: string) {
  const [entries, setEntries] = useState<Entry<T>[]>(() => {
    try {
      const value = JSON.parse(localStorage.getItem(key) ?? "[]");
      return Array.isArray(value)
        ? value
            .filter(
              (item) =>
                typeof item?.query === "string" &&
                item.data &&
                Number.isFinite(item.savedAt),
            )
            .slice(0, 10)
        : [];
    } catch {
      return [];
    }
  });
  const save = useCallback(
    (query: string, data: T) => {
      setEntries((previous) => {
        const next = [
          { query, data, savedAt: Date.now() },
          ...previous.filter(
            (entry) => entry.query.toLowerCase() !== query.toLowerCase(),
          ),
        ].slice(0, 10);
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* Storage may be unavailable or full. Keep this session usable. */
        }
        return next;
      });
    },
    [key],
  );
  return {
    entries,
    save,
    find: (query: string) =>
      entries.find(
        (entry) => entry.query.toLowerCase() === query.toLowerCase(),
      ),
  };
}
