import { useEffect, useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";

export function useSortAnimation(order: string) {
  const ref = useRef<HTMLDivElement>(null);
  const positions = useRef(new Map<string, { x: number; y: number }>());
  useLayoutEffect(() => {
    const elements =
      ref.current?.querySelectorAll<HTMLElement>("[data-sort-id]");
    if (!elements) return;
    const next = new Map<string, { x: number; y: number }>();
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    elements.forEach((element) => {
      const id = element.dataset.sortId!;
      const position = { x: element.offsetLeft, y: element.offsetTop };
      const previous = positions.current.get(id);
      const x = previous
        ? previous.x - position.x + Number(gsap.getProperty(element, "x"))
        : 0;
      const y = previous
        ? previous.y - position.y + Number(gsap.getProperty(element, "y"))
        : 0;
      gsap.killTweensOf(element);
      if (!reduced && (x || y))
        gsap.fromTo(
          element,
          { x, y },
          {
            x: 0,
            y: 0,
            duration: 0.4,
            ease: "power2.inOut",
            overwrite: true,
            clearProps: "transform",
          },
        );
      else gsap.set(element, { clearProps: "transform" });
      next.set(id, position);
    });
    positions.current = next;
  }, [order]);
  useEffect(() => {
    const container = ref.current;
    return () => {
      if (container)
        gsap.killTweensOf(container.querySelectorAll("[data-sort-id]"));
    };
  }, []);
  return ref;
}
