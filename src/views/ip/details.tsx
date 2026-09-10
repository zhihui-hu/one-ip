import { Link } from "react-router-dom";
import { CountryFlag } from "@/components/country-flag";
import {
  Facts,
  IpText,
  ToolCard,
  Pending,
  DataTable,
} from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { t, locale } from "@/i18n";
import { endpoint } from "@/lib/network";
import type { Geo, Lookup } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { LocationMap } from "./location-map";
import { reputation } from "./reputation";

interface Network {
  prefix?: string;
  asns: string[];
  ptr?: string;
  routeAvailable: boolean;
  ptrAvailable: boolean;
  validations: { asn: string; status: string; description?: string }[];
  source: string;
  checkedAt: string;
}
interface Registration {
  name?: string;
  handle?: string;
  startAddress?: string;
  endAddress?: string;
  country?: string;
  type?: string;
  events?: { eventAction: string; eventDate: string }[];
}
export function IpDetails({ data }: { data: Lookup }) {
  const ip = data.geo.ip;
  const network = useQuery({
    queryKey: ["ip-network", ip],
    queryFn: ({ signal }) =>
      endpoint<Network>(`/ip/network/${encodeURIComponent(ip)}`, { signal }),
    staleTime: 300_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const type = useQuery({
    queryKey: ["ip-type", ip],
    queryFn: ({ signal }) =>
      endpoint<{
        available: boolean;
        hosting?: boolean;
        mobile?: boolean;
        proxy?: boolean;
      }>(`/ip-type/${encodeURIComponent(ip)}`, { signal }),
    staleTime: 3600_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const provider = data.sources.find(
    (source) => source.source === "ip.sb" && source.isp,
  )?.isp;
  const risk = data.risk;
  const score = reputation(risk);
  const rdap = data.rdap as Registration | undefined;
  const yesNo = (value?: boolean) =>
    value == null ? t("未知") : value ? t("是") : t("否");
  const networkValue = (value?: string) =>
    network.isPending ? <Pending key="loading" /> : value || t("未提供");
  const date = rdap?.events?.find(
    (event) => event.eventAction === "registration",
  )?.eventDate;
  const rpkiLabels: Record<string, string> = {
    valid: t("有效"),
    invalid_asn: t("ASN 不匹配"),
    invalid_length: t("前缀长度不匹配"),
    unknown: t("未声明 ROA"),
    unavailable: t("查询失败"),
  };
  return (
    <div className="ip-dossier">
      <div className="ip-dossier-head">
        <div className="min-w-0">
          <h2 className="break-all text-xl font-semibold">
            <IpText ip={ip} link={false} />
          </h2>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <CountryFlag code={data.geo.country_code} />
            <span>
              {[data.geo.country, data.geo.city, provider ?? data.geo.isp]
                .filter(Boolean)
                .join(" · ") || t("归属信息暂不可用")}
            </span>
          </div>
        </div>
        <a href="#ip-reputation" className="ip-reputation-badge">
          <span>{t("IP 信誉分")}</span>
          <strong>{score.score ?? "—"}</strong>
          <small>
            {score.score == null ? t("数据不足") : t("本站规则 v1")}
          </small>
        </a>
      </div>
      <div className="ip-dossier-grid">
        <ToolCard title={t("使用场景 / 类型")}>
          <Facts
            rows={[
              [t("地址类型"), ip.includes(":") ? "IPv6" : "IPv4"],
              [
                t("ip-api 类型标记"),
                type.isPending ? (
                  <Pending key="loading" />
                ) : type.data?.available ? (
                  type.data.hosting ? (
                    t("数据中心")
                  ) : type.data.mobile ? (
                    t("移动网络")
                  ) : (
                    t("非机房 / 非移动")
                  )
                ) : (
                  t("未知")
                ),
              ],
              [t("服务商（ip.sb）"), provider],
              [
                t("ASN 组织（ipwho.is）"),
                data.sources.find((source) => source.source === "ipwho.is")
                  ?.isp,
              ],
              [t("注册网络"), rdap?.name],
              [t("注册类型"), rdap?.type],
            ]}
          />
          <p className="small muted mt-3">
            {t(
              "此处仅展示 ip-api.com 的类型标记，可能与其他数据库不同，不作为住宅或移动网络的最终结论。",
            )}
          </p>
        </ToolCard>
        <ToolCard title={t("ASN / 运营商")}>
          <Facts
            rows={[
              ["ASN", data.geo.asn ? `AS${data.geo.asn}` : undefined],
              [t("BGP 前缀"), networkValue(network.data?.prefix)],
              [
                t("路由 ASN"),
                networkValue(
                  network.data?.asns.map((asn) => `AS${asn}`).join(" / "),
                ),
              ],
              [
                t("注册地址范围"),
                rdap?.startAddress && rdap?.endAddress
                  ? `${rdap.startAddress} – ${rdap.endAddress}`
                  : undefined,
              ],
              [
                t("地址块注册日期"),
                date ? new Date(date).toLocaleDateString(locale) : undefined,
              ],
            ]}
          />
          <p className="small muted mt-3">
            {t("BGP 前缀来自 RIPE RIS，注册地址范围来自 RDAP，两者可能不同。")}
          </p>
        </ToolCard>
        <ToolCard title={t("技术指标")}>
          <Facts
            rows={[
              ["PTR", networkValue(network.data?.ptr)],
              [
                "RPKI",
                network.isPending ? (
                  <Pending key="loading" />
                ) : network.data?.validations.length ? (
                  network.data.validations
                    .map(
                      (v) =>
                        `AS${v.asn} · ${rpkiLabels[v.status] ?? t("未知")}`,
                    )
                    .join(" / ")
                ) : (
                  t("未提供")
                ),
              ],
              [t("时区"), data.geo.timezone],
            ]}
          />
          <p className="small muted mt-3">
            {t("RPKI 校验路由授权，不代表 IP 信誉；未声明不等于无效。")}
          </p>
          {(network.isError || network.data?.routeAvailable === false) && (
            <p className="small muted">{t("路由数据暂不可用")}</p>
          )}
        </ToolCard>
        <ToolCard title={t("风险深度检测")}>
          <Facts
            rows={[
              ["VPN", yesNo(risk.vpn)],
              [t("代理"), yesNo(risk.proxy)],
              ["Tor", yesNo(risk.tor)],
              [t("机器人"), yesNo(risk.bot_status)],
              [t("近期滥用"), yesNo(risk.recent_abuse)],
            ]}
          />
          <p className="small muted mt-3">
            {risk.available
              ? risk.source
              : t(risk.reason ?? "风险数据源暂不可用")}
          </p>
        </ToolCard>
      </div>
      <section id="ip-reputation">
        <ToolCard title={t("评分依据")}>
          <div className="row-between">
            <strong>
              {t("数据覆盖率")} {score.coverage}%
            </strong>
            <span className="small muted">{t("本站规则 v1")}</span>
          </div>
          <Facts
            rows={score.checks.map((check, index) => [
              [t("近期滥用"), t("机器人"), t("公开代理 / Tor")][index],
              `${check.weight}% · ${risk.available ? yesNo(check.value) : t("未知")}`,
            ])}
          />
          <p className="small muted mt-3">
            {t(
              "信誉分 = 100 − 命中项权重之和。所有风险项均有数据才出分；未知不算安全。此规则未经统计校准，不代表任何 AI 平台的官方风控评分。",
            )}
          </p>
          {risk.fraud_score != null && (
            <p className="small muted">
              {t("IPQS 原始风险分（越低越好）")} {risk.fraud_score}
            </p>
          )}
        </ToolCard>
      </section>
      <ToolCard title={t("地理位置 · 多源对比")}>
        <DataTable<Geo>
          columns={[
            { accessorKey: "source", header: t("数据源") },
            { accessorKey: "country", header: t("国家 / 地区") },
            { accessorKey: "city", header: t("城市") },
            { accessorKey: "isp", header: t("运营商") },
            { accessorKey: "asn", header: "ASN" },
          ]}
          data={data.sources}
          empty={t("未获取到归属地数据")}
        />
      </ToolCard>
      <LocationMap geo={data.geo} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link to={`/network/ping/?host=${encodeURIComponent(ip)}`}>
            {t("全球延迟测试")}
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link to={`/network/whois/?q=${encodeURIComponent(ip)}`}>
            {t("查看完整注册信息")}
          </Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void network.refetch();
            void type.refetch();
          }}
        >
          {t("刷新网络信息")}
        </Button>
      </div>
      <p className="small muted">
        {t(
          "来源：ipwho.is / ip.sb（归属地）、RDAP（注册）、RIPEstat（路由与 PTR）、ip-api.com（类型）。风险项仅在数据源可用时显示结论。",
        )}
      </p>
    </div>
  );
}
