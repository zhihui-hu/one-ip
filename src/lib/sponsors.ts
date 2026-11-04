export interface Sponsor {
  name: string;
  href: string;
  image?: string;
}

// Confirmed placements replace the three "Advertise here" slots in order.
export const sponsors: readonly Sponsor[] = [];
