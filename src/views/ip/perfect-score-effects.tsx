import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import "./ip.css";

const glowClass = "absolute block rounded-[50%] opacity-30";
const sparkClass =
  "absolute rounded-[50%] bg-[#f6dfac] opacity-15 shadow-[0_0_8px_rgba(242,207,141,0.4)]";

export function PerfectScoreEffects() {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const layer = root.current;
    const card = layer?.parentElement;
    if (!layer || !card) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const glow = layer.querySelectorAll("[data-perfect-glow]");
      const sheen = layer.querySelector("[data-perfect-sheen]");
      const sparks = layer.querySelectorAll("[data-perfect-spark]");
      const badge = card.querySelector("[data-perfect-badge]");
      const crown = card.querySelector("[data-perfect-label] svg");
      const timeline = gsap.timeline({ defaults: { ease: "power2.out" } });
      timeline.fromTo(
        layer,
        { opacity: 0 },
        { opacity: 1, duration: 0.35, clearProps: "opacity" },
        0,
      );
      if (badge)
        timeline.from(
          badge,
          { y: 8, opacity: 0, duration: 0.7, clearProps: "transform,opacity" },
          0,
        );
      if (crown)
        timeline.from(
          crown,
          {
            rotation: -12,
            scale: 0.8,
            duration: 0.8,
            ease: "back.out(1.5)",
            clearProps: "transform",
          },
          0.15,
        );
      timeline.fromTo(
        glow,
        { scale: 0.94, opacity: 0.3 },
        {
          scale: 1.08,
          opacity: 0.65,
          duration: 5,
          stagger: 0.5,
          repeat: 1,
          yoyo: true,
          ease: "sine.inOut",
        },
        0,
      );
      timeline
        .fromTo(
          sheen,
          { xPercent: 0, opacity: 0 },
          { opacity: 0.65, duration: 0.5 },
          0.4,
        )
        .to(sheen, { xPercent: 420, duration: 2.4, ease: "sine.inOut" }, 0.4)
        .to(sheen, { opacity: 0, duration: 0.6 }, 2.1);
      timeline.fromTo(
        sparks,
        { scale: 0.6, opacity: 0.15 },
        {
          scale: 1.15,
          opacity: 0.7,
          duration: 1.1,
          stagger: 0.2,
          repeat: 1,
          yoyo: true,
          ease: "sine.inOut",
        },
        0.6,
      );
      let visible = true;
      const updatePlayback = () => {
        if (document.hidden || !visible) timeline.pause();
        else timeline.resume();
      };
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        updatePlayback();
      });
      observer.observe(card);
      document.addEventListener("visibilitychange", updatePlayback);
      return () => {
        observer.disconnect();
        document.removeEventListener("visibilitychange", updatePlayback);
      };
    });
    return () => media.revert();
  }, []);
  return (
    <div
      ref={root}
      data-perfect-effects=""
      className="ip-perfect-starfield pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit] contain-strict after:absolute after:inset-0 after:z-1 after:rounded-[inherit] after:border after:border-[rgba(227,198,142,0.3)] after:bg-[linear-gradient(110deg,transparent_60%,rgba(227,198,142,0.04))] after:content-['']"
      aria-hidden="true"
    >
      <span
        data-perfect-glow=""
        className={`${glowClass} -top-[240px] -right-[80px] h-[420px] w-[420px] bg-[radial-gradient(circle,rgba(226,185,106,0.3),rgba(177,136,68,0.08)_48%,transparent_70%)]`}
      />
      <span
        data-perfect-glow=""
        className={`${glowClass} -bottom-[180px] -left-[130px] h-[260px] w-[360px] bg-[radial-gradient(ellipse,rgba(238,210,145,0.22),transparent_68%)]`}
      />
      <span
        data-perfect-sheen=""
        className="absolute -top-[30%] -left-[45%] h-[170%] w-[38%] bg-[linear-gradient(105deg,transparent_30%,rgba(244,219,167,0.11)_50%,transparent_70%)] opacity-0 [transform:skewX(-15deg)]"
      />
      <span
        data-perfect-spark=""
        className={`${sparkClass} top-[19%] right-[19%] size-[3px]`}
      />
      <span
        data-perfect-spark=""
        className={`${sparkClass} top-[38%] right-[33%] size-[2px]`}
      />
      <span
        data-perfect-spark=""
        className={`${sparkClass} right-[9%] bottom-[24%] size-[2px]`}
      />
    </div>
  );
}
