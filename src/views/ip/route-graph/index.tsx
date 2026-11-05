import { useState } from "react";
import { Pending, ToolCard } from "@/components/toolkit";
import { t } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import { AnnouncementChart } from "./announcement-chart";
import { snapshotDate, validationLabel } from "./layout";
import { RouteList } from "./route-list";
import { RouteTopologyChart } from "./topology-chart";
import { ipNetwork } from "../api";
import { routeGraphStateClass } from "../styles";

const pillButtonClass =
  "cursor-pointer rounded-[6px] border border-border bg-muted text-[11px] text-muted-foreground";
const validationsClass =
  "mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground";
const validationClass = "rounded-[6px] bg-muted px-[7px] py-[3px]";
const noteClass = "mt-2 text-[11px] leading-[1.6] text-muted-foreground";

export default function IpRouteGraph({
  ip,
  currentAsn,
  currentAsnName,
}: {
  ip: string;
  currentAsn?: number;
  currentAsnName?: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const network = useQuery({
    queryKey: ["ip-network", ip],
    queryFn: ({ signal }) => ipNetwork(ip, signal),
    staleTime: 300_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const data = network.data;
  const asns = [
    ...new Set((data?.asns ?? []).map(String).filter((asn) => asn.length > 0)),
  ];
  const topology = data?.topology;
  const title = (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
      <span className="font-semibold">{t("ip.bgpRouteTopology")}</span>
      <button
        type="button"
        className={`${pillButtonClass} px-1.5 py-0.5 hover:border-info-text hover:text-info-text focus-visible:border-info-text focus-visible:text-info-text`}
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? t("common.collapse") : t("common.expand")}
      </button>
      {topology && (
        <span className="min-w-0 overflow-hidden text-[11px] font-normal text-ellipsis whitespace-nowrap text-muted-foreground max-md:basis-full max-md:whitespace-normal">
          {data?.prefix} · {topology.observedPaths.toLocaleString()}{" "}
          {t("ip.observedPaths")}
        </span>
      )}
    </div>
  );

  return (
    <ToolCard title={title}>
      {expanded &&
        (network.isPending ? (
          <div className={routeGraphStateClass}>
            <Pending>{t("ip.readingRoutingData")}</Pending>
          </div>
        ) : network.isError || !data?.routeAvailable || !data.prefix ? (
          <p className={`${routeGraphStateClass} text-muted-foreground`}>
            {t("ip.routingDataUnavailable")}
          </p>
        ) : topology ? (
          <>
            <div className="mb-2.5 flex min-w-0 overflow-x-auto [scrollbar-width:thin]">
              <button
                type="button"
                className={`${pillButtonClass} grid flex-none gap-0.5 px-[9px] py-[5px] text-left disabled:cursor-default aria-[current=true]:border-info-text aria-[current=true]:text-info-text`}
                aria-current="true"
                disabled
              >
                <span className="text-[11px] text-foreground tabular-nums">
                  {snapshotDate(topology.queryTime)}
                </span>
                <small className="text-[10px]">
                  {t("ip.currentUpstreams", [topology.direct.length])}
                </small>
              </button>
            </div>
            <RouteTopologyChart
              topology={topology}
              currentAsn={currentAsn}
              currentAsnName={currentAsnName}
            />
            <RouteList
              topology={topology}
              currentAsn={currentAsn}
              currentAsnName={currentAsnName}
            />
            {!!data.validations?.length && (
              <div className={validationsClass}>
                {data.validations.map((validation) => (
                  <span key={validation.asn} className={validationClass}>
                    AS{validation.asn} · {validationLabel(validation.status)}
                  </span>
                ))}
              </div>
            )}
            <p className={noteClass}>
              {t("ip.currentSnapshotComesRipeRisLineWidthShows")}
            </p>
          </>
        ) : (
          <>
            <div className="mb-2.5 flex items-start justify-between gap-3 text-[11px] text-muted-foreground">
              <div className="min-w-0">
                <strong className="block truncate text-[13px] text-foreground">
                  {data.prefix}
                </strong>
                <span className="leading-[1.6]">
                  {data.source ?? "RIPE RIS / RIPEstat"}
                  {data.ptr ? ` · PTR ${data.ptr}` : ""}
                </span>
              </div>
              <span className="shrink-0 leading-[1.6]">
                {asns.length} {t("ip.announcingAsns")}
              </span>
            </div>
            <AnnouncementChart
              ip={ip}
              prefix={data.prefix}
              asns={asns}
              currentAsn={currentAsn}
              currentAsnName={currentAsnName}
            />
            {!!data.validations?.length && (
              <div className={validationsClass}>
                {data.validations.map((validation) => (
                  <span key={validation.asn} className={validationClass}>
                    AS{validation.asn} · {validationLabel(validation.status)}
                  </span>
                ))}
              </div>
            )}
            <p className={noteClass}>
              {t("ip.sourceReturnsBgpPrefixAnnouncingAsnsCompletePath")}
            </p>
          </>
        ))}
    </ToolCard>
  );
}
