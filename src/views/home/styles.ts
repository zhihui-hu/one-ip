// Home dashboard layout, shared with the loading skeleton.
// (Full class strings: Tailwind only sees literal candidates.)

export const homePageClass = [
  "grid grid-cols-[minmax(0,1fr)] gap-3 *:my-0 max-md:gap-2.5",
  // Denser cards and titles than elsewhere.
  "[&_[data-slot=card]]:gap-2 [&_[data-slot=card]]:[--card-spacing:0.75rem] max-md:[&_[data-slot=card]]:[--card-spacing:0.625rem]",
  "[&_[data-slot=card-title]]:text-[14px] [&_[data-slot=card-title]]:leading-[1.4] [&_[data-slot=card-title]]:font-[650]",
  // Links and text buttons turn primary on hover; most also underline, except
  // UnderlineHover links and the shortcut tiles / tool directory.
  "[&_:is(a,button,summary):not([data-slot=button]):is(:hover,:focus-visible)]:text-primary",
  "[&_:is(a,button,summary):not([data-slot=button]):not([data-underline-hover]):not(:where([data-plain-links]_a,[data-plain-summary]>summary)):is(:hover,:focus-visible)]:underline",
  "[&_:is(a,button,summary):not([data-slot=button]):not([data-underline-hover]):not(:where([data-plain-links]_a,[data-plain-summary]>summary)):is(:hover,:focus-visible)]:underline-offset-4",
  "[&_button:disabled]:no-underline [&_summary>span]:text-inherit",
].join(" ");

export const homeToolbarClass =
  "flex min-w-0 items-center justify-between gap-3 max-xs:flex-wrap max-xs:gap-2";
export const homeToolbarActionsClass = "flex min-w-0 items-center gap-1";

// `my-0!` beats the layout's `[&_[data-slot=card]]:mt-2` card spacing.
export const homeIpOverviewClass =
  "grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] items-stretch gap-3 max-md:gap-2.5 max-xs:grid-cols-1 [&>[data-slot=card]]:my-0! [&>[data-slot=card]]:h-auto [&_[data-slot=sweep-shine]]:text-[0.8rem] [&_[data-slot=sweep-shine]]:font-normal";
export const homeNetworkOverviewClass =
  "grid grid-cols-2 items-stretch gap-3 max-md:grid-cols-[minmax(0,1fr)] max-md:gap-2.5 [&>[data-slot=card]]:my-0! [&>[data-slot=card]]:min-w-0 [&>[data-slot=card]>[data-slot=card-content]]:grid [&>[data-slot=card]>[data-slot=card-content]]:flex-1";
export const homePingGridClass = "grid h-full grid-cols-2 gap-2 max-md:gap-1.5";

// IP overview card: the old `.home-page .home-primary-card` border beat the
// layout's card reset, hence `border!`.
export const homePrimaryCardClass = "border! border-border bg-card";
export const homePrimaryBlockClass = "min-w-0 rounded-none bg-transparent";
