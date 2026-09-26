import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function OverviewCard() {
  return (
    <Card className="home-primary-card">
      <CardContent className="primary-ip-block space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-44" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-3 w-48" />
        </div>
      </CardContent>
    </Card>
  );
}

function ConnectivitySkeleton() {
  return (
    <Card className="home-connectivity-card">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="ping-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/70 px-2.5 py-2"
              key={index}
            >
              <Skeleton className="size-4 shrink-0 rounded-full" />
              <Skeleton className="h-3 min-w-0 flex-1" />
              <Skeleton className="h-3 w-8 shrink-0" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <div className="flex items-center gap-3" key={index}>
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-3 w-3/4" />
            </div>
            <Skeleton className="h-4 w-4 shrink-0" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function HomePageSkeleton() {
  return (
    <div className="home-page" aria-busy="true">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Skeleton className="h-5 w-24" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-36 sm:w-44" />
          <Skeleton className="h-7 w-20" />
        </div>
      </div>
      <div className="home-overview home-ip-overview">
        <OverviewCard />
        <OverviewCard />
        <ConnectivitySkeleton />
      </div>
      <SectionSkeleton rows={4} />
      <SectionSkeleton rows={3} />
      <SectionSkeleton rows={4} />
    </div>
  );
}
