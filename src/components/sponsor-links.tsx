import { t } from "@/i18n";
import { sponsors, type Sponsor } from "@/lib/sponsors";
import { cn } from "@/lib/utils";
import { AuthorContact } from "./author-contact";

const itemClass = "min-w-[100px] flex-[0_0_calc((100%-16px)/3)]";
const linkClass =
  "flex h-11 w-full cursor-pointer items-center justify-center gap-[5px] overflow-hidden rounded-[5px] border border-border bg-card px-2 text-[11px] whitespace-nowrap text-muted-foreground no-underline hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring [&>span:first-of-type]:overflow-hidden [&>span:first-of-type]:text-ellipsis";
/** Vacancy tint by list position (1st, 2nd, 3rd of each three). */
const vacancyTones = [
  "border-[color-mix(in_srgb,#3b82f6_35%,var(--border))] bg-[color-mix(in_srgb,#3b82f6_10%,var(--card))] hover:bg-[color-mix(in_srgb,#3b82f6_10%,var(--card))]",
  "border-[color-mix(in_srgb,#10b981_35%,var(--border))] bg-[color-mix(in_srgb,#10b981_10%,var(--card))] hover:bg-[color-mix(in_srgb,#10b981_10%,var(--card))]",
  "border-[color-mix(in_srgb,#f59e0b_35%,var(--border))] bg-[color-mix(in_srgb,#f59e0b_10%,var(--card))] hover:bg-[color-mix(in_srgb,#f59e0b_10%,var(--card))]",
] as const;

export function SponsorLinks({
  items = sponsors,
}: {
  items?: readonly Sponsor[];
}) {
  const vacantCount = Math.max(0, 3 - items.length);

  return (
    <aside
      className="flex h-11 max-w-full min-w-0 items-center"
      aria-label={t("common.sponsorAdvertisements")}
    >
      <ul className="m-0 flex min-w-0 flex-1 list-none gap-2 overflow-x-auto p-0 [scrollbar-width:none]">
        {items.map((sponsor) => (
          <li key={sponsor.href} className={itemClass}>
            <a
              className={cn(linkClass, sponsor.image && "p-0")}
              href={sponsor.href}
              target="_blank"
              rel="sponsored noopener noreferrer"
              title={sponsor.name}
            >
              {sponsor.image ? (
                <img
                  src={sponsor.image}
                  alt={sponsor.name}
                  className="size-full flex-none object-contain"
                  width="320"
                  height="44"
                />
              ) : (
                <>
                  <span>{sponsor.name}</span>
                  <span aria-hidden="true">↗</span>
                </>
              )}
            </a>
          </li>
        ))}
        {Array.from({ length: vacantCount }, (_, index) => (
          <li key={`vacant-${index}`} className={itemClass}>
            <AuthorContact
              className={cn(
                linkClass,
                "border-dashed text-[12px] font-[550] text-foreground",
                vacancyTones[(items.length + index) % 3],
              )}
            >
              <span>{t("common.advertiseHere")}</span>
              <span aria-hidden="true">↗</span>
            </AuthorContact>
          </li>
        ))}
      </ul>
    </aside>
  );
}
