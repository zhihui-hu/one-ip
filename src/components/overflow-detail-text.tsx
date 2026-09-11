import { useLayoutEffect, useRef, useState } from "react";
import { DetailText } from "./detail-text";

export function OverflowDetailText({
  text,
  title,
}: {
  text: string;
  title?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () =>
      setTruncated(element.scrollWidth > element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text]);
  return (
    <div className="relative min-w-0">
      <span
        ref={ref}
        className={`block truncate ${truncated ? "invisible" : ""}`}
      >
        {text}
      </span>
      {truncated && (
        <div className="absolute inset-0">
          <DetailText text={text} title={title} />
        </div>
      )}
    </div>
  );
}
