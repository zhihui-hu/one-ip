import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Renders `children` only once the placeholder scrolls near the viewport, so
 * their queries and work start when someone is about to see them. Until then
 * `fallback` (usually a skeleton of the same size) holds the space.
 */
export function LazyMount({
  children,
  fallback = null,
  rootMargin = "0px",
  threshold = 0,
  className,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  /** How far outside the viewport to start, as in IntersectionObserver. */
  rootMargin?: string;
  /** Share of the placeholder that must be visible, 0 to 1. */
  threshold?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(
    () => typeof IntersectionObserver === "undefined",
  );
  useEffect(() => {
    const element = ref.current;
    if (visible || !element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible, rootMargin, threshold]);
  return (
    <div ref={ref} className={className}>
      {visible ? children : fallback}
    </div>
  );
}
