// Adapted from Beautiful UI StreamingText (MIT, copyright 2026 Shane Levine).
// See public/licenses/beautiful-ui.txt. Types out text that is already known.
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A run of text; `strong` marks a value worth underlining. */
export type AnswerPart = string | { text: string; strong?: boolean };

const textOf = (part: AnswerPart) =>
  typeof part === "string" ? part : part.text;

const reducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** Moves a reveal point forward so Latin words and surrogate pairs are never split. */
function wordEnd(text: string, end: number) {
  while (end < text.length && /\w/.test(text[end]) && /\w/.test(text[end - 1]))
    end++;
  if (end < text.length && /[\ud800-\udbff]/.test(text[end - 1])) end++;
  return end;
}

/** The parts up to `limit` characters, as paragraphs ("\n" starts a new one). */
function paragraphsOf(
  parts: AnswerPart[],
  limit: number,
  strongClassName: string,
) {
  const paragraphs: ReactNode[][] = [[]];
  let left = limit;
  parts.forEach((part, index) => {
    if (left <= 0) return;
    const full = textOf(part);
    const visible = full.slice(0, left);
    left -= full.length;
    visible.split("\n").forEach((line, lineIndex) => {
      if (lineIndex > 0) paragraphs.push([]);
      if (!line) return;
      const key = `${index}-${lineIndex}`;
      paragraphs[paragraphs.length - 1].push(
        typeof part !== "string" && part.strong ? (
          <span key={key} className={strongClassName}>
            {line}
          </span>
        ) : (
          <span key={key}>{line}</span>
        ),
      );
    });
  });
  return paragraphs;
}

function Caret() {
  return (
    <span
      aria-hidden="true"
      className="ml-0.5 inline-block h-[1.05em] w-0.5 translate-y-[0.18em] animate-pulse rounded-full bg-foreground/80 motion-reduce:animate-none"
    />
  );
}

/**
 * Types out known text like a streamed reply. The finished text is laid out
 * invisibly underneath, so the reveal never shifts the page; screen readers get
 * it whole. `after` (a signature, say) appears once the text is written.
 */
export function StreamingAnswer({
  parts,
  speed = 80,
  animate = true,
  onDone,
  after,
  className,
  strongClassName = "font-medium text-foreground underline decoration-primary/45 decoration-[1.5px] underline-offset-[5px]",
}: {
  parts: AnswerPart[];
  /** Characters per second. */
  speed?: number;
  /** False shows the text whole at once, for a reply already seen. */
  animate?: boolean;
  /** Called once the whole text is showing (again if the text changes). */
  onDone?: () => void;
  after?: ReactNode;
  className?: string;
  strongClassName?: string;
}) {
  const text = parts.map(textOf).join("");
  const total = text.length;
  const [shown, setShown] = useState(() =>
    !animate || document.hidden || reducedMotion() ? total : 0,
  );

  useEffect(() => {
    if (!animate || shown >= total) return;
    const start = performance.now() - (shown * 1000) / speed;
    let frame = requestAnimationFrame(function step(now) {
      const next = wordEnd(
        text,
        Math.min(total, Math.floor(((now - start) * speed) / 1000)),
      );
      setShown((current) => Math.max(current, next));
      if (next < total) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
    // Restart only when the text itself changes, not on every reveal step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, total, speed, animate]);

  const done = !animate || shown >= total;
  useEffect(() => {
    if (done) onDone?.();
    // Once per finished text, not whenever the callback's identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, text]);
  const full = paragraphsOf(parts, total, strongClassName);
  const visible = paragraphsOf(parts, done ? total : shown, strongClassName);
  const layer = "col-start-1 row-start-1 space-y-3";
  return (
    <div
      data-slot="streaming-answer"
      data-streaming={!done}
      className={cn("grid", className)}
    >
      <div className={cn(layer, "invisible")} aria-hidden="true">
        {full.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
        {after}
      </div>
      <div className={layer} aria-hidden="true">
        {visible.map((paragraph, index) => (
          <p key={index}>
            {paragraph}
            {!done && index === visible.length - 1 && <Caret />}
          </p>
        ))}
        <div
          className={cn(
            "transition-opacity duration-500",
            done ? "opacity-100" : "opacity-0",
          )}
        >
          {after}
        </div>
      </div>
      <span className="sr-only">{text}</span>
    </div>
  );
}
