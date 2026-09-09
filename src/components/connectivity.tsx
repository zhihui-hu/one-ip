import { Pending } from "@/components/toolkit";
import { testConnectivity } from "@/views/link/api";
import { useQuery } from "@tanstack/react-query";

export interface Target {
  name: string;
  icon?: string;
  url: string;
}
export function ConnectivityTile({
  target,
  round = 0,
}: {
  target: Target;
  round?: number;
}) {
  const query = useQuery({
    queryKey: ["connectivity", target.url, round],
    queryFn: ({ signal }) => testConnectivity(target.url, signal),
    staleTime: 60_000,
    retry: false,
  });
  return (
    <div className="ping-item">
      {target.icon && (
        <img
          className="site-icon"
          src={target.icon}
          alt=""
          onError={(e) => {
            e.currentTarget.style.visibility = "hidden";
          }}
        />
      )}
      <div className="ping-label">
        <div>{target.name}</div>
        <div className="ping-dots">
          {Array.from({ length: 8 }, (_, i) => (
            <span
              key={i}
              className={`ping-dot ${query.data ? (query.data.samples[i] < 0 ? "dot-fail" : query.data.samples[i] < 100 ? "dot-good" : query.data.samples[i] < 400 ? "dot-warn" : "dot-slow") : ""}`}
            />
          ))}
        </div>
      </div>
      <span className="ping-ms" title="浏览器 HTTP 请求耗时，非 ICMP 延迟">
        {query.isPending ? (
          <Pending>···</Pending>
        ) : query.data?.median != null ? (
          `${query.data.median}ms`
        ) : (
          "未知"
        )}
      </span>
    </div>
  );
}
export const homeTargets: Target[] = [
  {
    name: "字节跳动",
    icon: "/favicons/bytedance.webp",
    url: "https://perfops.byte-test.com/500b-bench.jpg",
  },
  {
    name: "淘宝",
    icon: "/favicons/taobao.webp",
    url: "https://www.taobao.com/favicon.ico",
  },
  {
    name: "微信",
    icon: "/favicons/weixin.webp",
    url: "https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico",
  },
  {
    name: "GitHub",
    icon: "/favicons/github.webp",
    url: "https://github.com/generate_204",
  },
  {
    name: "Cloudflare",
    icon: "/favicons/cloudflare.webp",
    url: "https://1.1.1.1/cdn-cgi/trace",
  },
  {
    name: "YouTube",
    icon: "/favicons/youtube.webp",
    url: "https://www.youtube.com/generate_204",
  },
];
