import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ConnectivityTile } from "@/components/connectivity";
import {
  PageHeading,
  ToolCard,
  Facts,
  IpText,
  Pending,
  ReadingLinks,
} from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UnderlineHover } from "@/components/underline-hover";
import { flag } from "@/lib/network";
import type { Risk } from "@/lib/types";
import { claudeApi } from "@/views/claude/api";
import { claudeHistoryAtom } from "@/views/claude/store";
import { gptApi } from "@/views/gpt/api";
import { gptHistoryAtom } from "@/views/gpt/store";
import { useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { deviceInfo } from "./device";
import readings from "./readings.json";

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
  const device = useQuery({
    queryKey: ["device-local"],
    queryFn: deviceInfo,
    staleTime: Infinity,
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
    <>
      <PageHeading
        title={
          kind === "claude"
            ? "Claude AI IP 风险检测"
            : "ChatGPT · Codex IP 风险检测"
        }
        description={`检测当前${label}出口 IP 的纯净度、风险、IP 属性（住宅/机房/原生）、DNS、UDP、指纹、历史和安全性`}
        privacy
      />
      <div className="three-grid ip-heroes">
        {[
          [domestic, "中国出口IPv4"],
          [cf, "Cloudflare 出口IP"],
          [exit, `${label}出口IP`],
        ].map(([raw, heading]) => {
          const query = raw as typeof domestic;
          return (
            <ToolCard title={heading as string} key={heading as string}>
              <div className="ip-value">
                {query.isPending ? (
                  <Pending>查询中…</Pending>
                ) : (
                  <IpText ip={query.data?.ip} />
                )}
              </div>
              <p className="muted small">
                {query.data
                  ? `${flag(query.data.country_code)} ${query.data.country ?? query.data.country_code ?? "归属地查询中"}`
                  : query.isError
                    ? "未知：连接失败或跨域限制"
                    : "正在检测出口"}
              </p>
            </ToolCard>
          );
        })}
      </div>
      <div className="three-grid">
        <ToolCard title={`${label}信任评分 (Trust Score)`}>
          <div className="gauge-score">
            {risk.isFetching ? <Pending>检测中…</Pending> : (score ?? "—")}
          </div>
          <p className="small muted">
            {score !== null
              ? "100 − IPQS 风险分；非平台官方评分"
              : (risk.data?.reason ?? "无法获得风险数据，不计算评分")}
          </p>
          <div className="gauge-bar">
            {score !== null && (
              <span style={{ left: `${Math.max(0, Math.min(100, score))}%` }} />
            )}
          </div>
          <div className="gauge-labels">
            <span>0 高危</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100 可信</span>
          </div>
          <Facts
            rows={[
              [
                `${label}支持地区`,
                <UnderlineHover asChild>
                  <a
                    href={
                      kind === "claude"
                        ? "https://www.anthropic.com/supported-countries"
                        : "https://platform.openai.com/docs/supported-countries"
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    查看官方名单 ↗
                  </a>
                </UnderlineHover>,
              ],
            ]}
          />
        </ToolCard>
        <ToolCard title={`${label}出口IP 属性`}>
          <Facts
            rows={[
              ["地区", geo.data?.country],
              ["城市", geo.data?.city],
              ["IP 属性", risk.data?.connection_type ?? "未知"],
              ["ASN", geo.data?.asn],
              ["运营商", geo.data?.isp],
            ]}
          />
        </ToolCard>
        <ToolCard title={`${label}出口IP安全检测`}>
          <RiskFacts risk={risk.data} />
        </ToolCard>
        <ToolCard
          title={
            kind === "claude" ? "Claude 可用性检测" : "GPT · Codex 可用检测"
          }
        >
          {(kind === "claude"
            ? ["claude.ai", "anthropic.com"]
            : ["chatgpt.com", "api.openai.com"]
          ).map((domain) => (
            <ConnectivityTile
              key={domain}
              target={{ name: domain, url: `https://${domain}/favicon.ico` }}
            />
          ))}
          <p className="small muted">
            仅检测浏览器 HTTP 连通情况，不代表账号可用或模型权限。
          </p>
        </ToolCard>
        <ToolCard title="DNS 泄露检测">
          <Facts
            rows={[
              ["状态", "未检测"],
              ["DNS 出口 IP", "—"],
            ]}
          />
          <Button variant="outline" asChild>
            <Link to="/dns/">查询DNS安全</Link>
          </Button>
        </ToolCard>
        <ToolCard title="WebRTC UDP 泄露检测">
          <Facts
            rows={[
              ["状态", "未检测"],
              ["UDP 出口 IP", "—"],
            ]}
          />
          <Button variant="outline" asChild>
            <Link to="/webrtc/">深度查询</Link>
          </Button>
        </ToolCard>
      </div>
      <ToolCard title={`${label}出口IP用户设备信息`} className="full-card">
        {device.isPending ? (
          <Pending>读取本机信息…</Pending>
        ) : device.data ? (
          <Facts rows={device.data} />
        ) : (
          <p>当前浏览器限制读取设备信息。</p>
        )}
        <p className="small muted">
          设备信息和指纹仅在本地计算，不发送到后端。
        </p>
      </ToolCard>
      <ToolCard title={`${label} 出口 IP 历史记录`} className="full-card">
        <div className="row-between">
          <p className="small muted">
            历史数据仅保存在当前浏览器，最多 20 条，可随时清除
          </p>
          <Button variant="ghost" size="sm" onClick={() => setHistory([])}>
            清除
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
          <p className="muted">暂无历史记录</p>
        )}
      </ToolCard>
      <ReadingLinks links={readings[kind]} />
    </>
  );
}
