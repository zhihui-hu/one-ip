import { AuthorContact } from "@/components/author-contact";
import { ErrorNotice, PageHeading } from "@/components/toolkit";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/i18n";
import { endpoint } from "@/lib/network";
import { useQuery } from "@tanstack/react-query";
import { CloudflareCard } from "./cloudflare-card";
import { statsConfig } from "./config";
import { GithubCards } from "./github-card";
import { AudienceSections, SlotSection } from "./sections";
import type { AdvertiseStats } from "./types";

function StatsSkeleton() {
  return (
    <Card aria-busy="true" aria-label={t("advertise.loading")}>
      <CardContent className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-72 max-w-[60%]" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-[76px] rounded-[12px]" />
          ))}
        </div>
        <Skeleton className="h-56 w-full" />
      </CardContent>
    </Card>
  );
}

export default function AdvertisePage() {
  const query = useQuery({
    queryKey: ["advertise-stats"],
    queryFn: ({ signal }) =>
      endpoint<AdvertiseStats>("/advertise/stats", { signal }),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  return (
    <div className="grid gap-3 [&>[data-slot=card]]:mt-0">
      <PageHeading title={t("advertise.title")} />
      <p className="m-0 text-[13px] text-muted-foreground">
        {t("advertise.siteDataHint")}
      </p>
      <ErrorNotice error={query.error} />
      {query.isPending ? (
        <StatsSkeleton />
      ) : (
        query.data && (
          <>
            <CloudflareCard
              stats={query.data.cloudflare}
              updatedAt={query.data.updatedAt}
            />
            <GithubCards
              stats={query.data.github}
              updatedAt={query.data.updatedAt}
            />
          </>
        )
      )}
      <AudienceSections />
      {statsConfig.showSlotSection && <SlotSection />}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="m-0 text-sm font-semibold">
              {t("advertise.contactTitle")}
            </h2>
            <p className="mt-1 mb-0 text-[13px] text-muted-foreground">
              {t("advertise.contactHint")}
            </p>
          </div>
          <AuthorContact className={buttonVariants({ size: "sm" })}>
            {t("advertise.contactButton")}
          </AuthorContact>
        </CardContent>
      </Card>
    </div>
  );
}
