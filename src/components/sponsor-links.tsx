import { useState } from "react";
import { Link } from "react-router-dom";
import { t } from "@/i18n";
import { activeSponsors, type Sponsor } from "@/lib/sponsors";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

/** Text sponsors and vacancies share whatever width the banners leave. */
const itemClass = "min-w-[100px] flex-1";
/** Banners are 640×88 artwork: the full row on phones, 320×44 beyond. */
const bannerItemClass = "aspect-[640/88] w-full flex-none sm:w-[320px]";
const bannerLinkClass =
  "block size-full cursor-pointer overflow-hidden rounded-[5px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const linkClass =
  "flex h-full min-h-11 w-full cursor-pointer items-center justify-center gap-[5px] overflow-hidden rounded-[5px] border border-border bg-card px-2 text-[11px] whitespace-nowrap text-muted-foreground no-underline hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring [&>span:first-of-type]:overflow-hidden [&>span:first-of-type]:text-ellipsis";
/** Vacancy tint by list position (1st, 2nd, 3rd of each three). */
const vacancyTones = [
  "border-[color-mix(in_srgb,#3b82f6_35%,var(--border))] bg-[color-mix(in_srgb,#3b82f6_10%,var(--card))] hover:bg-[color-mix(in_srgb,#3b82f6_10%,var(--card))]",
  "border-[color-mix(in_srgb,#10b981_35%,var(--border))] bg-[color-mix(in_srgb,#10b981_10%,var(--card))] hover:bg-[color-mix(in_srgb,#10b981_10%,var(--card))]",
  "border-[color-mix(in_srgb,#f59e0b_35%,var(--border))] bg-[color-mix(in_srgb,#f59e0b_10%,var(--card))] hover:bg-[color-mix(in_srgb,#f59e0b_10%,var(--card))]",
] as const;

/** Closed banners stay closed for the browser session, keyed by their link. */
const CLOSED_KEY = "one-ip:sponsors-closed";

function readClosed(): readonly string[] {
  try {
    const stored: unknown = JSON.parse(
      sessionStorage.getItem(CLOSED_KEY) ?? "[]",
    );
    return Array.isArray(stored) ? stored.map(String) : [];
  } catch {
    return [];
  }
}

export function SponsorLinks({
  items: listed = activeSponsors(),
}: {
  items?: readonly Sponsor[];
}) {
  const [closed, setClosed] = useState(readClosed);
  // A closed banner hands its slot back to the "Advertise here" blocks.
  const items = listed.filter((sponsor) => !closed.includes(sponsor.href));
  const vacantCount = Math.max(0, 3 - items.length);

  const close = (href: string) => {
    const next = [...closed, href];
    setClosed(next);
    try {
      sessionStorage.setItem(CLOSED_KEY, JSON.stringify(next));
    } catch {
      // Storage is blocked: the banner still closes until the next page load.
    }
  };

  return (
    <aside
      className="flex min-h-11 max-w-full min-w-0"
      aria-label={t("common.sponsorAdvertisements")}
    >
      <ul className="m-0 flex min-w-0 flex-1 list-none gap-2 overflow-x-auto p-0 [scrollbar-width:none]">
        {items.map((sponsor) => (
          <li
            key={sponsor.href}
            className={
              sponsor.image ? cn(bannerItemClass, "relative") : itemClass
            }
          >
            <a
              className={sponsor.image ? bannerLinkClass : linkClass}
              href={sponsor.href}
              target="_blank"
              rel="sponsored noopener noreferrer"
              title={sponsor.name}
            >
              {sponsor.image ? (
                <img
                  src={sponsor.image}
                  alt={sponsor.name}
                  className="block size-full object-cover"
                  width="640"
                  height="88"
                />
              ) : (
                <>
                  <span>{sponsor.name}</span>
                  <span aria-hidden="true">↗</span>
                </>
              )}
            </a>
            {sponsor.image && (
              <button
                type="button"
                onClick={() => close(sponsor.href)}
                className="absolute top-0.5 right-0.5 flex size-4 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                aria-label={t("common.closeAdvertisement")}
                title={t("common.closeAdvertisement")}
              >
                <X className="size-2.5" strokeWidth={3} aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
        {Array.from({ length: vacantCount }, (_, index) => (
          <li key={`vacant-${index}`} className={itemClass}>
            <Link
              to="/advertise"
              className={cn(
                linkClass,
                "border-dashed text-[12px] font-[550] text-foreground",
                vacancyTones[(items.length + index) % 3],
              )}
            >
              <span>{t("common.advertiseHere")}</span>
              <span aria-hidden="true">↗</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
