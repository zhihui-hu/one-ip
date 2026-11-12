export interface Sponsor {
  name: string;
  href: string;
  image?: string;
  /** Artwork for the English interface; `image` serves every other locale. */
  imageEn?: string;
  /** Artwork width and height in px when it is not the standard 640×88. */
  imageSize?: readonly [number, number];
  /**
   * When the placement goes up: "YYYY-MM-DD HH:mm:ss" in UTC+8. A bare date
   * means 00:00:00; omitted starts at once.
   */
  startsAt?: string;
  /**
   * The last second the placement shows: "YYYY-MM-DD HH:mm:ss" in UTC+8. A
   * bare date means 23:59:59. Its date is shown on /advertise.
   */
  endsAt?: string;
}

// Confirmed placements replace the three "Advertise here" slots in order.
// A placement shows only between its dates, so an expired entry takes itself
// down; delete it here afterwards.
export const sponsors: readonly Sponsor[] = [
  {
    name: "Proxy-Seller",
    href: "https://proxy-seller.com/?partner=C23994CEA11142E6",
    image: "/sponsors/proxy-seller-zh.jpg",
    imageEn: "/sponsors/proxy-seller-en.jpg",
    imageSize: [298, 44],
    startsAt: "2026-11-12 00:00:00",
    endsAt: "2026-12-11 23:59:59",
  },
  {
    name: "ZooProxy",
    href: "https://zooproxy.com/?kwd=zsy-oneip",
    image: "/sponsors/zooproxy.png",
    startsAt: "2026-11-11 00:00:00",
    endsAt: "2026-12-10 23:59:59",
  },
];

/** Epoch ms of a UTC+8 "YYYY-MM-DD[ HH:mm:ss]"; `fallback` fills a bare date. */
function instant(value: string, fallback: string): number {
  const [date, time = fallback] = value.trim().split(/[ T]/);
  return Date.parse(`${date}T${time}+08:00`);
}

export function isSponsorActive(sponsor: Sponsor, now = Date.now()): boolean {
  if (sponsor.startsAt && now < instant(sponsor.startsAt, "00:00:00"))
    return false;
  if (sponsor.endsAt && now >= instant(sponsor.endsAt, "23:59:59") + 1000)
    return false;
  return true;
}

/** Placements running at `now`, in list order. */
export function activeSponsors(
  now = Date.now(),
  items: readonly Sponsor[] = sponsors,
): readonly Sponsor[] {
  return items.filter((sponsor) => isSponsorActive(sponsor, now));
}
