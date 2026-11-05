export interface Sponsor {
  name: string;
  href: string;
  image?: string;
  /** Last day of the placement (YYYY-MM-DD, UTC+8); shown on /advertise. */
  endsAt?: string;
}

// Confirmed placements replace the three "Advertise here" slots in order.
export const sponsors: readonly Sponsor[] = [];
