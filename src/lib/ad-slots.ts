import { activeSponsors } from "@/lib/sponsors";

const sponsors = activeSponsors();

/** Ad placements that exist on One IP. Fill in `price` to publish it. */
export interface AdSlot {
  id: "home-top" | "readme";
  /** Number of placements; omitted when the slot has no fixed count. */
  total?: number;
  /** Booked placements, derived from the live sponsor list. */
  booked?: number;
  /** Earliest end date (YYYY-MM-DD) among booked placements. */
  nextFree?: string;
  /** Shown as written, e.g. "¥1000 / 月"; omitted shows "price on request". */
  price?: string;
  /** Screenshot of the placement on a phone (in public/advertise/). */
  preview: { src: string; width: number; height: number };
}

const homeEnds = sponsors
  .map((sponsor) => sponsor.endsAt)
  .filter((date): date is string => Boolean(date))
  .map((date) => date.slice(0, 10))
  .sort();

export const adSlots: readonly AdSlot[] = [
  {
    id: "home-top",
    total: 3,
    booked: Math.min(3, sponsors.length),
    nextFree: homeEnds[0],
    preview: { src: "/advertise/home-mobile.webp", width: 750, height: 270 },
  },
  {
    id: "readme",
    preview: { src: "/advertise/readme-mobile.webp", width: 750, height: 790 },
  },
];
