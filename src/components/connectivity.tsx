import { CompactText } from "@/components/compact-text";
import { LatencyBadge } from "@/components/latency-badge";
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
  const name = (
    <span className="site-cell">
      <SiteLogo src={target.icon} website={target.url} />
      <CompactText text={target.name} />
    </span>
  );
  const dots = (
    <div className="ping-dots">
      {Array.from({ length: 8 }, (_, i) => (
        <span
          key={i}
          className={`ping-dot ${result?.samples[i] !== undefined ? (result.samples[i] < 0 ? "dot-fail" : result.samples[i] < 100 ? "dot-good" : result.samples[i] < 400 ? "dot-warn" : "dot-slow") : ""}`}
        />
      ))}
    </div>
  );
  const latency = <LatencyBadge result={result} running={query.isFetching} />;
  return table ? (
    <TableRow data-sort-id={target.name} aria-busy={query.isFetching}>
      <TableCell>{name}</TableCell>
      <TableCell>{dots}</TableCell>
      <TableCell>{latency}</TableCell>
    </TableRow>
  ) : (
    <div
      data-sort-id={target.name}
      className="ping-item"
      aria-busy={query.isFetching}
    >
      <div className="ping-label">
        {name}
        {dots}
      </div>
      {latency}
    </div>
  );
}

export const homeTargets: Target[] = [
  {
    name: t("字节跳动"),
    icon: "https://icons.duckduckgo.com/ip3/bytedance.com.ico",
    url: "https://perfops.byte-test.com/500b-bench.jpg",
  },
  {
    name: t("淘宝"),
    icon: "https://icons.duckduckgo.com/ip3/taobao.com.ico",
    url: "https://www.taobao.com/favicon.ico",
  },
  {
    name: t("微信"),
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
