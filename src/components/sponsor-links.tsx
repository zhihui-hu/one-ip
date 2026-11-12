import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { locale, t } from "@/i18n";
import { activeSponsors, type Sponsor } from "@/lib/sponsors";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

/** Text sponsors and vacancies share whatever width the banners leave. */
const itemClass = "min-w-[100px] flex-1";
/**
 * Banners keep their artwork's ratio (640×88 unless the sponsor says
 * otherwise). On phones they share the row, each as wide as its ratio so
 * all come out the same height; from `sm` up each is 44px high.
 */
const bannerItemClass =
  "relative min-w-0 flex-[var(--banner-ratio)_1_0%] self-center sm:h-11 sm:w-auto sm:flex-none";
const bannerSize = [640, 88] as const;
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
  // A phone row has no room for banners and vacancies at a readable size.
  const hasBanner = items.some((sponsor) => sponsor.image);

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
      className="flex max-w-full min-w-0 sm:min-h-11"
      aria-label={t("common.sponsorAdvertisements")}
    >
      <ul className="m-0 flex min-w-0 flex-1 list-none gap-2 overflow-x-auto p-0 [scrollbar-width:none]">
        {items.map((sponsor) => {
          const image = (locale === "en" && sponsor.imageEn) || sponsor.image;
          const [width, height] = sponsor.imageSize ?? bannerSize;
          return (
            <li
              key={sponsor.href}
              className={image ? bannerItemClass : itemClass}
              style={
                image
                  ? ({
                      aspectRatio: `${width} / ${height}`,
                      "--banner-ratio": width / height,
                    } as CSSProperties)
                  : undefined
              }
            >
              <a
                className={image ? bannerLinkClass : linkClass}
                href={sponsor.href}
                target="_blank"
                rel="sponsored noopener noreferrer"
                title={sponsor.name}
              >
                {image ? (
                  <img
                    src={image}
                    alt={sponsor.name}
                    className="block size-full object-cover"
                    width={width}
                    height={height}
                  />
                ) : (
                  <>
                    <span>{sponsor.name}</span>
                    <span aria-hidden="true">↗</span>
                  </>
                )}
              </a>
              {image && (
                <button
                  type="button"
                  onClick={() => close(sponsor.href)}
                  className="absolute top-0.5 right-0.5 flex size-3 cursor-pointer sm:size-4 items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                  aria-label={t("common.closeAdvertisement")}
                  title={t("common.closeAdvertisement")}
                >
                  <X
                    className="size-2 sm:size-2.5"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                </button>
              )}
            </li>
          );
        })}
        {Array.from({ length: vacantCount }, (_, index) => (
          <li
            key={`vacant-${index}`}
            className={cn(itemClass, hasBanner && "max-sm:hidden")}
          >
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
