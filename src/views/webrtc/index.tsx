import { useState } from "react";
import { CountryFlag } from "@/components/country-flag";
import { DataTable } from "@/components/data-table";
import { LeakConclusion } from "@/components/leak-conclusion";
import { LookupFaq } from "@/components/lookup-faq";
import {
  ActionButton,
  ErrorNotice,
  Facts,
  IpText,
  Pending,
} from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { t } from "@/i18n";
import type { Geo, RtcResult, RtcStatus } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { runWebRtc } from "./api";

const statusVariant = {
  match: "success",
  leak: "danger",
  local: "warning",
  unverified: "secondary",
} as const satisfies Record<RtcStatus, string>;

function EgressValue({ geo, pending }: { geo: Geo | null; pending: boolean }) {
  if (pending) return <Pending>{t("common.loading")}</Pending>;
  if (!geo) return <>{t("leak.unavailable")}</>;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <CountryFlag code={geo.country_code} />
      <IpText ip={geo.ip} />
    </span>
  );
}

const columns: ColumnDef<RtcResult>[] = [
  { id: "number", header: "#", cell: ({ row }) => row.index + 1 },
  {
    accessorKey: "ip",
    header: t("webrtc.ipAddress"),
    cell: ({ row }) => <IpText ip={row.original.ip} />,
  },
  { accessorKey: "type", header: t("webrtc.type") },
  {
    id: "protocol",
    header: t("webrtc.protocol"),
    cell: ({ row }) =>
      [
        ...(row.original.family ? [`IPv${row.original.family}`] : []),
        ...(row.original.protocols ?? []).map((item) => item.toUpperCase()),
      ].join(" · ") || "—",
  },
  {
    id: "geo",
    header: t("common.location"),
    cell: ({ row }) =>
      row.original.geo ? (
        <>
          <CountryFlag code={row.original.geo.country_code} />{" "}
          {row.original.geo.country ?? ""} {row.original.geo.city ?? ""}
        </>
      ) : (
        t("common.unknown")
      ),
  },
  {
    id: "state",
    header: t("common.status"),
    cell: ({ row }) => {
      const status =
        row.original.status ?? (row.original.public ? "unverified" : "local");
      return (
        <Badge variant={statusVariant[status]}>
          {t(`webrtc.status.${status}`)}
        </Badge>
      );
    },
  },
];
export default function WebRtcPage() {
  const [round, setRound] = useState(0);
  const query = useQuery({
    queryKey: ["webrtc-diagnostic", round],
    queryFn: ({ signal }) => runWebRtc(undefined, signal),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  const level = query.isFetching || !query.data ? "pending" : query.data.level;
  return (
    <>
      <Card className="mb-3">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm">
              {t("webrtc.webrtcEgressCheck")}
            </CardTitle>
            <ActionButton
              size="sm"
              busy={query.isFetching}
              onClick={() => setRound((n) => n + 1)}
            >
              {query.isFetching
                ? t("common.checkingDots")
                : t("common.runAgain")}
            </ActionButton>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <LeakConclusion
            level={level}
            title={t(`webrtc.conclusion.${level}`)}
            detail={
              query.isFetching
                ? t("webrtc.collectingIceCandidates")
                : (query.data?.verdict ?? t("webrtc.checkIncomplete"))
            }
          />
          <Facts
            className="grid gap-x-6 md:grid-cols-2"
            rows={[
              [
                t("leak.httpEgressIpv4"),
                <EgressValue
                  key="ipv4"
                  geo={query.data?.egress.ipv4 ?? null}
                  pending={query.isFetching}
                />,
              ],
              [
                t("leak.httpEgressIpv6"),
                <EgressValue
                  key="ipv6"
                  geo={query.data?.egress.ipv6 ?? null}
                  pending={query.isFetching}
                />,
              ],
              [
                t("webrtc.publicCandidates"),
                query.data?.results.filter((row) => row.public).length ?? 0,
              ],
              [t("webrtc.mdnsHidden"), query.data?.mdns ?? 0],
              [
                t("webrtc.localExposed"),
                query.data?.localExposed.length
                  ? query.data.localExposed.join(", ")
                  : t("webrtc.none"),
              ],
            ]}
          />
        </CardContent>
      </Card>
      <ErrorNotice error={query.error} />
      {Boolean(query.data?.results.length) && (
        <Card>
          <CardContent>
            <DataTable
              data={query.data?.results ?? []}
              columns={columns}
              getRowId={(row) => `${row.kind ?? row.type}|${row.ip}`}
              animateChanges={false}
              animateEntries
            />
          </CardContent>
        </Card>
      )}
      <LookupFaq
        items={[
          {
            title: t("webrtc.whatIsAWebrtcLeak"),
            text: t("webrtc.webrtcUsesIceStunDiscoverAddressesPeerPeer"),
          },
          {
            title: t("webrtc.whatAreStunAndUdp"),
            text: t(
              "webrtc.udpConnectionlessTransportProtocolStunServerReturnsPublic",
            ),
          },
          {
            title: t("webrtc.faq.mdnsTitle"),
            text: t("webrtc.faq.mdnsText"),
          },
          {
            title: t("webrtc.howITellIfThereLeak"),
            text: t(
              "webrtc.differentEgressIndicatesDifferentUdpHttpRoutesWhich",
            ),
          },
          {
            title: t("webrtc.howDoIFixALeak"),
            text: t("webrtc.checkUdpForwardingTunTrafficHandlingIpv6Rules"),
          },
          {
            title: t("webrtc.whyDoProxyTunModesGiveDifferentResults"),
            text: t(
              "webrtc.systemProxyVirtualNetworkAdapterModesHandleDifferent",
            ),
          },
        ]}
      />
    </>
  );
}
