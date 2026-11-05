import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { NavigationItem } from "./navigation-menus";
import { activeTool } from "./routes";

/** Tabs for the tools inside one section, shown on every screen size. */
export function SectionTabs({
  label,
  items,
}: {
  label: string;
  items: readonly NavigationItem[];
}) {
  const { pathname } = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const current = activeTool(pathname);

  useEffect(() => {
    const viewport = navRef.current?.querySelector<HTMLElement>(
      "[data-slot=scroll-area-viewport]",
    );
    const selected = navRef.current?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );
    if (!viewport || !selected) return;
    const parent = viewport.getBoundingClientRect();
    const child = selected.getBoundingClientRect();
    const offset =
      child.left < parent.left
        ? child.left - parent.left - 8
        : child.right > parent.right
          ? child.right - parent.right + 8
          : 0;
    if (offset) viewport.scrollBy({ left: offset, behavior: "instant" });
  }, [pathname, items]);

  return (
    <nav
      ref={navRef}
      className="mb-3.5 min-w-0 border-b border-border max-md:sticky max-md:top-0 max-md:z-30 max-md:mb-3 max-md:bg-background [&_[data-orientation=vertical]]:hidden [&_[data-slot=scroll-area-viewport]]:w-full [&_[data-slot=scroll-area-viewport]]:overscroll-x-contain"
      aria-label={label}
    >
      <ScrollArea>
        <div className="flex w-max items-center gap-6 px-0.5 max-md:gap-5">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className="-mb-px inline-flex min-h-10 flex-none items-center border-b-2 border-transparent text-[0.875rem] whitespace-nowrap text-muted-foreground no-underline transition-[color,border-color] duration-150 ease-[ease] hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring aria-[current=page]:border-b-primary aria-[current=page]:font-semibold aria-[current=page]:text-primary max-md:min-h-11 max-md:text-[0.8125rem]"
              aria-current={item.path === current ? "page" : undefined}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </nav>
  );
}
