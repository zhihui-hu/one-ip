import { PageHeading, ActionButton, Pending } from "@/components/toolkit";
import { flag, pool } from "@/lib/network";
import { useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { RefreshCw } from "lucide-react";
import { testConnectivity } from "./api";
import { connectivityRoundAtom } from "./store";
import targets from "./targets.json";

const groups = [
  ["cn", "中国"],
  ["jp", "日本"],
  ["us", "美国"],
  ["gl", "全球"],
];
export default function LinkPage() {
  const [round, setRound] = useAtom(connectivityRoundAtom);
  const query = useQuery({
    queryKey: ["all-connectivity", round],
    queryFn: ({ signal }) =>
      pool(
        targets,
        async (target) => ({
          ...target,
          ...(await testConnectivity(target.url, signal)),
        }),
        9,
      ),
    retry: false,
    staleTime: 60_000,
  });
  return (
    <>
      <PageHeading
        title="网络连通性测试"
        description="一键测试当前网络到全球各大知名网站的实时连通性与延迟数据。用来判断分流规则是否生效、线路是否通畅。"
      />
      <div className="toolbar">
        <ActionButton
          variant="outline"
          busy={query.isFetching}
          onClick={() => setRound((n) => n + 1)}
        >
          <RefreshCw data-icon="inline-start" />
          重新测试
        </ActionButton>
        <span className="legend">
          <i className="dot-good" />优 <i className="dot-warn" />良{" "}
          <i className="dot-slow" />慢 <i className="dot-fail" />
          未知
        </span>
      </div>
      {groups.map(([cc, label]) => (
        <section className="country-block" key={cc}>
          <h2>
            {cc === "gl" ? "🌐" : flag(cc)} {label}
            <span>
              {query.isFetching ? (
                <Pending>正在测试…</Pending>
              ) : (
                `可读取响应 ${query.data?.filter((t) => t.cc === cc && t.median !== null).length ?? 0}/${targets.filter((t) => t.cc === cc).length}`
              )}
            </span>
          </h2>
          <div className="connectivity-grid">
            {targets
              .filter((t) => t.cc === cc)
              .map((target) => {
                const result = query.data?.find((t) => t.name === target.name);
                return (
                  <div className="ping-item" key={target.name}>
                    <img
                      className="site-icon"
                      src={target.icon}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.style.visibility = "hidden";
                      }}
                    />
                    <div className="ping-label">
                      <div>{target.name}</div>
                      <div className="ping-dots">
                        {Array.from({ length: 8 }, (_, i) => (
                          <span
                            key={i}
                            className={`ping-dot ${result ? (result.samples[i] < 0 ? "dot-fail" : result.samples[i] < 100 ? "dot-good" : result.samples[i] < 400 ? "dot-warn" : "dot-slow") : ""}`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="ping-ms">
                      {query.isFetching ? (
                        <Pending>···</Pending>
                      ) : result?.median != null ? (
                        `${result.median}ms`
                      ) : (
                        "未知"
                      )}
                    </span>
                  </div>
                );
              })}
          </div>
        </section>
      ))}
      <p className="principle">
        <strong>测试原理：</strong>在你的浏览器本地向各站点发起轻量 HTTP
        请求，取 8 轮成功请求耗时的中位数。不是服务器代测，也不是 ICMP
        Ping。浏览器安全策略、广告拦截和超时都可能造成失败；opaque 响应无法判断
        HTTP 状态或服务业务是否正常。
      </p>
    </>
  );
}
