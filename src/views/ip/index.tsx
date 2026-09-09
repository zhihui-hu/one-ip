import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { LookupForm } from "@/components/lookup-form";
import {
  PageHeading,
  ToolCard,
  Facts,
  IpText,
  DataTable,
  ErrorNotice,
  Pending,
} from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { useDiagnostic } from "@/hooks/use-diagnostic";
import type { Geo } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { lookupIp, currentIp } from "./api";

const columns: ColumnDef<Geo>[] = [
  { accessorKey: "source", header: "数据源" },
  { accessorKey: "country", header: "国家 / 地区" },
  { accessorKey: "city", header: "城市" },
  { accessorKey: "isp", header: "运营商" },
  { accessorKey: "asn", header: "ASN" },
];
export default function IpPage() {
  const { ip = "" } = useParams();
  const navigate = useNavigate();
  const me = useDiagnostic((_: void, signal) => currentIp(signal));
  useEffect(() => {
    if (me.data?.ip) navigate(`/ip/${encodeURIComponent(me.data.ip)}`);
  }, [me.data, navigate]);
  const query = useQuery({
    queryKey: ["lookup-ip", ip],
    enabled: !!ip,
    queryFn: ({ signal }) => lookupIp(ip, signal),
    retry: false,
  });
  const data = query.data;
  return (
    <>
      <PageHeading
        title="IP 评分查询"
        description="IP深度查询，家宽 or 机房 、人机流量、多源比对、地理经纬度、端口、滥用、黑名单、全球延迟一手掌握"
        privacy
      />
      <LookupForm
        value={ip}
        placeholder="输入 IPv4 或 IPv6 地址"
        busy={query.isFetching}
        onSubmit={(value) => navigate(`/ip/${encodeURIComponent(value)}`)}
      />
      <div className="examples">
        <Button
          variant="ghost"
          size="sm"
          disabled={me.isPending}
          onClick={() => me.mutate()}
        >
          {me.isPending ? <Pending>获取本机 IP…</Pending> : "查询我的 IP"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/ip/1.1.1.1")}
        >
          1.1.1.1
        </Button>
      </div>
      <ErrorNotice error={query.error ?? me.error} />
      {query.isFetching && (
        <p className="status-line">
          <Pending>正在查询多源 IP 情报…</Pending>
        </p>
      )}
      {data && (
        <div className="lookup-results">
          <div className="result-title">
            <h2>
              <IpText ip={data.geo.ip} link={false} />
            </h2>
            <Button variant="outline" asChild>
              <Link to={`/ping/?host=${encodeURIComponent(data.geo.ip)}`}>
                全球延迟测试
              </Link>
            </Button>
          </div>
          <div className="three-grid">
            <ToolCard title="风险评分">
              <div className="gauge-score">
                {data.risk.available ? (data.risk.fraud_score ?? "—") : "—"}
              </div>
              <p className="small muted">
                {data.risk.available
                  ? `${data.risk.source} · 风险越低越好`
                  : data.risk.reason}
              </p>
            </ToolCard>
            <ToolCard title="使用场景 / 类型">
              <Facts
                rows={[
                  ["IP 属性", data.risk.connection_type ?? "未提供"],
                  [
                    "VPN",
                    data.risk.vpn == null
                      ? "未知"
                      : data.risk.vpn
                        ? "是"
                        : "否",
                  ],
                  [
                    "代理",
                    data.risk.proxy == null
                      ? "未知"
                      : data.risk.proxy
                        ? "是"
                        : "否",
                  ],
                ]}
              />
            </ToolCard>
            <ToolCard title="ASN / 运营商">
              <Facts
                rows={[
                  ["ASN", data.geo.asn],
                  ["运营商", data.geo.isp],
                  ["时区", data.geo.timezone],
                ]}
              />
            </ToolCard>
          </div>
          <section className="reading">
            <h2>地理位置（多源对比）</h2>
            <DataTable
              columns={columns}
              data={data.sources}
              empty="未获取到归属地数据"
            />
          </section>
          <div className="two-grid">
            <ToolCard title="技术指标">
              <Facts
                rows={[
                  ["地址类型", data.geo.ip.includes(":") ? "IPv6" : "IPv4"],
                  ["经度", data.geo.longitude],
                  ["纬度", data.geo.latitude],
                ]}
              />
            </ToolCard>
            <ToolCard title="IP 情报（威胁指标）">
              <Facts
                rows={[
                  [
                    "Tor",
                    data.risk.tor == null
                      ? "未知"
                      : data.risk.tor
                        ? "是"
                        : "否",
                  ],
                  [
                    "机器人",
                    data.risk.bot_status == null
                      ? "未知"
                      : data.risk.bot_status
                        ? "是"
                        : "否",
                  ],
                  [
                    "近期滥用",
                    data.risk.recent_abuse == null
                      ? "未知"
                      : data.risk.recent_abuse
                        ? "是"
                        : "否",
                  ],
                ]}
              />
            </ToolCard>
          </div>
          <section className="reading">
            <h2>风险深度检测</h2>
            <p className="principle">
              {data.unavailable.join("；")}。未提供不等于无风险。
            </p>
            <div className="two-grid">
              {[
                "VPN 溯源",
                "关联域名",
                "位置历史",
                "ASN 历史",
                "企业历史",
                "同机房 / 客户活跃",
              ].map((title) => (
                <ToolCard key={title} title={title}>
                  <p className="muted">尚未接入该情报数据源</p>
                </ToolCard>
              ))}
            </div>
          </section>
          {data.rdap && (
            <section className="reading">
              <h2>注册信息（RDAP）</h2>
              <Button variant="outline" asChild>
                <Link to={`/whois/?q=${encodeURIComponent(ip)}`}>
                  查看完整注册信息
                </Link>
              </Button>
            </section>
          )}
        </div>
      )}
    </>
  );
}
