import { useEffect } from "react";
import { CountryFlag } from "@/components/country-flag";
import { NumberTicker } from "@/components/number-ticker";
import {
  PrivacyToggle,
  PageHeading,
  ToolCard,
  Facts,
  IpText,
  Pending,
} from "@/components/toolkit";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Risk } from "@/lib/types";
import { AiNetworkCheck } from "@/views/ai/network-check";
import { AiPlatformLinks } from "@/views/ai/platform-links";
import { aiPlatforms } from "@/views/ai/platforms";
import { claudeApi } from "@/views/claude/api";
import { claudeHistoryAtom } from "@/views/claude/store";
import { gptApi } from "@/views/gpt/api";
import { gptHistoryAtom } from "@/views/gpt/store";
import { useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";

function riskLabel(value: boolean | undefined) {
  return value === undefined ? (
    "未知"
  ) : value ? (
    <Badge variant="destructive">是</Badge>
  ) : (
    <Badge variant="secondary">否</Badge>
  );
}
export function RiskFacts({ risk }: { risk?: Risk }) {
  return (
    <Facts
      rows={[
        ["VPN", riskLabel(risk?.vpn)],
        ["代理 (Proxy)", riskLabel(risk?.proxy)],
        ["Tor", riskLabel(risk?.tor)],
        ["机器人 (Crawler)", riskLabel(risk?.bot_status)],
        ["滥用记录", riskLabel(risk?.recent_abuse)],
      ]}
    />
  );
}
export default function AiDiagnostics({ kind }: { kind: "claude" | "gpt" }) {
  const api = kind === "claude" ? claudeApi : gptApi;
  const label = kind === "claude" ? "Claude AI" : "ChatGPT";
  const [history, setHistory] = useAtom(
    kind === "claude" ? claudeHistoryAtom : gptHistoryAtom,
  );
  const domestic = useQuery({
    queryKey: ["domestic-ip"],
    queryFn: ({ signal }) => api.domestic(signal),
    retry: false,
  });
  const cf = useQuery({
    queryKey: ["cf-exit"],
    queryFn: ({ signal }) => api.cloudflare(signal),
    retry: false,
  });
  const exit = useQuery({
    queryKey: [kind, "exit"],
    queryFn: ({ signal }) => api.exit(signal),
    retry: false,
  });
  const ip = exit.data?.ip;
  const geo = useQuery({
    queryKey: ["geo", ip],
    enabled: !!ip,
    queryFn: ({ signal }) => api.geo(ip!, signal),
    retry: false,
  });
  const risk = useQuery({
    queryKey: ["risk", ip],
    enabled: !!ip,
    queryFn: ({ signal }) => api.risk(ip!, signal),
    retry: false,
  });
  useEffect(() => {
    if (ip)
      setHistory((previous) =>
        previous[0]?.ip === ip
          ? previous
          : [{ ip, time: new Date().toISOString() }, ...previous].slice(0, 20),
      );
  }, [ip, setHistory]);
  const score =
    risk.data?.available && typeof risk.data.fraud_score === "number"
      ? 100 - risk.data.fraud_score
      : null;
  return (
    <div className="ai-diagnostics">
      <PageHeading
        title={
          kind === "claude" ? "Claude AI 网络检测" : "ChatGPT · Codex 网络检测"
        }
        description=""
      />
      <div className="ai-overview">
        <ToolCard
          title={
            <div className="flex items-center justify-between gap-3">
              <span>{label} 出口</span>
              <PrivacyToggle />
            </div>
          }
        >
          <div className="ip-value text-primary">
            {exit.isPending ? (
              <Pending>正在检测出口…</Pending>
            ) : (
              <IpText ip={ip} />
            )}
          </div>
          {exit.isError ? (
            <p className="small muted">暂未获取出口，可能受连接或跨域限制。</p>
          ) : geo.isFetching ? (
            <p className="small muted">
              <Pending>正在查询归属信息…</Pending>
            </p>
          ) : geo.isError ? (
            <p className="small muted">归属信息暂不可用。</p>
          ) : (
            <p className="small muted">
              <CountryFlag
                code={geo.data?.country_code ?? exit.data?.country_code}
              />{" "}
              {[geo.data?.country ?? exit.data?.country_code, geo.data?.city]
                .filter(Boolean)
                .join(" · ") || "归属地未知"}
            </p>
          )}
          <Facts
            rows={[
              ["运营商", geo.data?.isp],
              ["ASN", geo.data?.asn],
              ...(risk.data?.connection_type
                ? [["IP 属性", risk.data.connection_type] as [string, string]]
                : []),
            ]}
          />
          <div className="ai-exit-comparison">
            <span className="small muted">其他出口对照</span>
            {[
              { query: domestic, title: "国内 IPv4" },
              { query: cf, title: "Cloudflare" },
            ].map(({ query, title }) => (
              <div className="ai-exit-row" key={title}>
                <span className="muted">{title}</span>
                <span>
                  {query.isPending ? (
                    <Pending>检测中…</Pending>
                  ) : query.isError ? (
                    <span className="muted">暂不可用</span>
                  ) : (
                    <IpText ip={query.data?.ip} />
                  )}
                </span>
              </div>
            ))}
            {(domestic.isError || cf.isError) && (
              <p className="small muted">对照出口可能受连接或跨域限制。</p>
            )}
          </div>
        </ToolCard>
        <AiNetworkCheck
          domains={
            kind === "claude"
              ? ["claude.ai", "anthropic.com"]
              : ["chatgpt.com", "api.openai.com"]
          }
        >
          <p className="small muted mt-3">
            浏览器 HTTP 探测，不代表账号可用或模型权限。
          </p>
          <AiPlatformLinks
            platform={aiPlatforms.find((platform) => platform.id === kind)!}
          />
        </AiNetworkCheck>
      </div>
      <Accordion type="multiple" className="ai-details">
        <AccordionItem value="risk">
          <AccordionTrigger>
            <span>
              IP 风险参考{" "}
              <span className="ai-detail-summary">
                {risk.isFetching
                  ? "检测中"
                  : risk.data?.available
                    ? "IPQualityScore"
                    : "暂无数据"}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            {risk.isFetching ? (
              <Pending>正在读取风险数据…</Pending>
            ) : risk.data?.available ? (
              <>
                <p className="small muted mb-3">
                  第三方参考分：
                  <strong className="text-foreground">
                    {score !== null ? <NumberTicker value={score} /> : "—"}
                  </strong>{" "}
                  / 100 · 100 − IPQS 风险分，非平台官方评分。
                </p>
                <RiskFacts risk={risk.data} />
              </>
            ) : (
              <p className="small muted">
                {risk.data?.reason ??
                  (ip
                    ? "风险数据源暂不可用。"
                    : "获取平台出口后才能查询风险信息。")}
              </p>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="history">
          <AccordionTrigger>
            <span>
              出口历史{" "}
              <span className="ai-detail-summary">
                {history.length} 条 · 当前浏览器
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="row-between">
              <p className="small muted">仅保存在当前浏览器，最多 20 条</p>
              <Button
                variant="ghost"
                size="sm"
                disabled={!history.length}
                onClick={() => setHistory([])}
              >
                清除记录
              </Button>
            </div>
            {history.length ? (
              <div className="history-grid">
                {history.map((item) => (
                  <div key={item.time}>
                    <IpText ip={item.ip} />
                    <time>{new Date(item.time).toLocaleString("zh-CN")}</time>
                  </div>
                ))}
              </div>
            ) : (
              <p className="small muted">暂无历史记录</p>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
