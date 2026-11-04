import { t } from "@/i18n";
import { sponsors, type Sponsor } from "@/lib/sponsors";
import { AuthorContact } from "./author-contact";

export function SponsorLinks({
  items = sponsors,
}: {
  items?: readonly Sponsor[];
}) {
  const vacantCount = Math.max(0, 3 - items.length);

  return (
    <aside className="sponsor-links" aria-label={t("common.sponsorAdvertisements")}>
      <ul className="sponsor-links-list">
        {items.map((sponsor) => (
          <li key={sponsor.href}>
            <a
              href={sponsor.href}
              target="_blank"
              rel="sponsored noopener noreferrer"
              title={sponsor.name}
            >
              {sponsor.image ? (
                <img
                  src={sponsor.image}
                  alt={sponsor.name}
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
          <li key={`vacant-${index}`}>
            <AuthorContact className="sponsor-vacancy">
              <span>{t("common.advertiseHere")}</span>
              <span aria-hidden="true">↗</span>
            </AuthorContact>
          </li>
        ))}
      </ul>
    </aside>
  );
}
