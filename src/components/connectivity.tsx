import { CompactText } from "@/components/compact-text";
import { LatencyBadge } from "@/components/latency-badge";
import { latencyTone, pingDotClass } from "@/components/ping-dot";
import { SiteLogo } from "@/components/site-logo";
import { TableRow, TableCell } from "@/components/ui/table";
import { t } from "@/i18n";
import { testConnectivity, type ProbeResult } from "@/views/link/api";
import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Target {
  name: string;
  icon?: string;
  url: string;
}
export function ConnectivityTile({
  target,
  round = 0,
  table = false,
}: {
  target: Target;
  round?: number;
  table?: boolean;
}) {
  const client = useQueryClient();
  const progressKey = ["connectivity-progress", target.url, round];
  const progress = useQuery<ProbeResult>({
    queryKey: progressKey,
    enabled: false,
    queryFn: skipToken,
  });
  const query = useQuery({
    queryKey: ["connectivity", target.url, round],
    queryFn: ({ signal }) =>
      testConnectivity(target.url, signal, (result) =>
        client.setQueryData(progressKey, result),
      ),
    staleTime: 60_000,
    retry: false,
  });
  const result = query.isFetching ? progress.data : query.data;
  // Tiles only render on the home connectivity card, so the home sizing lives here.
  const name = (
    <span className="flex min-w-0 items-center gap-2 font-semibold whitespace-nowrap max-md:gap-1 max-md:text-[12px]">
      <SiteLogo
        src={target.icon}
        website={target.url}
        className="size-4 max-md:size-[15px]"
      />
      <CompactText text={target.name} />
    </span>
  );
  const dots = (
    <div className="mt-1 flex gap-0.5">
      {Array.from({ length: 8 }, (_, i) => (
        <span
          key={i}
          className={pingDotClass(
            result?.samples[i] !== undefined
              ? latencyTone(result.samples[i])
              : undefined,
            "max-md:size-1",
          )}
        />
      ))}
    </div>
  );
  const latency = (
    <LatencyBadge
      result={result}
      running={query.isFetching}
      className="font-[650] max-md:text-[11px] max-xs:text-[11px]"
    />
  );
  return table ? (
    <TableRow data-sort-id={target.name} aria-busy={query.isFetching}>
      <TableCell>{name}</TableCell>
      <TableCell>{dots}</TableCell>
      <TableCell>{latency}</TableCell>
    </TableRow>
  ) : (
    <div
      data-sort-id={target.name}
      className="flex min-w-0 items-center gap-1.5 rounded-[8px] border-0 bg-[color-mix(in_srgb,var(--muted)_70%,transparent)] px-2.5 py-2 text-[0.82rem] max-md:gap-1 max-md:p-2 max-xs:text-[0.73rem]"
      aria-busy={query.isFetching}
    >
      <div className="min-w-0 flex-1">
        {name}
        {dots}
      </div>
      {latency}
    </div>
  );
}

export const homeTargets: Target[] = [
  {
    name: t("sites.byteDance"),
    icon: "https://icons.duckduckgo.com/ip3/bytedance.com.ico",
    url: "https://perfops.byte-test.com/500b-bench.jpg",
  },
  {
    name: t("sites.taobao"),
    icon: "https://icons.duckduckgo.com/ip3/taobao.com.ico",
    url: "https://www.taobao.com/favicon.ico",
  },
  {
    name: t("sites.wechat"),
    icon: "https://icons.duckduckgo.com/ip3/weixin.qq.com.ico",
    url: "https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico",
  },
  {
    name: "GitHub",
    icon: "https://icons.duckduckgo.com/ip3/github.com.ico",
    url: "https://github.com/generate_204",
  },
  {
    name: "Cloudflare",
    icon: "https://icons.duckduckgo.com/ip3/cloudflare.com.ico",
    url: "https://1.1.1.1/cdn-cgi/trace",
  },
  {
    name: "YouTube",
    icon: "https://icons.duckduckgo.com/ip3/youtube.com.ico",
    url: "https://www.youtube.com/generate_204",
  },
];
