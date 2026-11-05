import { NavLink } from "react-router-dom";
import { navigationRoutes } from "./routes";

/** Flat section links; tools inside a section are tabs on the page itself. */
export function DesktopNavigation({ activeRoute }: { activeRoute: string }) {
  return (
    <ul className="m-0 flex min-w-0 flex-1 list-none items-center gap-1 p-0">
      {navigationRoutes.map((route) => (
        <li key={route.value}>
          <NavLink
            to={route.value.replace(/\/$/, "") || "/"}
            className="inline-flex h-9 items-center rounded-[999px] px-3.5 text-[0.875rem] font-medium whitespace-nowrap text-muted-foreground no-underline transition-[color,background-color] duration-150 ease-[ease] hover:bg-[color-mix(in_srgb,var(--muted)_80%,transparent)] hover:text-foreground focus-visible:bg-[color-mix(in_srgb,var(--muted)_80%,transparent)] focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[current=page]:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] aria-[current=page]:text-primary"
            aria-current={route.value === activeRoute ? "page" : undefined}
          >
            {route.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
