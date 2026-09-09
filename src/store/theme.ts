import { atomWithStorage } from "jotai/utils";

export type Theme = "light" | "dark" | "system";

export const themeAtom = atomWithStorage<Theme>(
  "theme",
  "system",
  {
    getItem(key, initialValue) {
      try {
        const value = localStorage.getItem(key);
        return value === "light" || value === "dark" || value === "system"
          ? value
          : initialValue;
      } catch {
        return initialValue;
      }
    },
    setItem(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* Storage may be disabled. */
      }
    },
    removeItem(key) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* Storage may be disabled. */
      }
    },
  },
  { getOnInit: true },
);
