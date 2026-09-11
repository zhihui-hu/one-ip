import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CopyButton } from "@/components/copy-button";
import { CountryFlag } from "@/components/country-flag";
import { NumberTicker } from "@/components/number-ticker";
import { IpText, ToolCard, DataTable } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { t } from "@/i18n";
import { companyTypeColors } from "@/lib/ip-badge-colors";
import { ipScoreColor } from "@/lib/ip-score";
import type { Geo } from "@/lib/types";
import { hideIpAtom } from "@/store/privacy";
import { useAtom } from "jotai";
import { Eye, EyeOff } from "lucide-react";
import type { CoffeeLookup } from "./coffee";
import { IpFacts } from "./field-help";
import { IpLatency } from "./latency";
import { LocationMap } from "./location-map";

export function IpDetails({
  data,
  search,
  recent,
}: {
  data: CoffeeLookup;
  search?: ReactNode;
  recent?: ReactNode;
}) {
  const mobile = useIsMobile();
  const [hidden, setHidden] = useAtom(hideIpAtom);
  const d = data.coffee;
  const chip = (label: string, tone = "neutral", title?: string) => (
    <span className={`ip-chip ip-chip-${tone}`} title={title}>
      {label}
    </span>
  );
  const yesNo = (value?: boolean) =>
    chip(typeof value !== "boolean" ? t("未知") : value ? t("是") : t("否"));
  const riskFlag = (value?: boolean) =>
    typeof value !== "boolean"
      ? chip(t("未知"))
      : value
        ? chip(t("已检测到"), "bad")
        : chip(t("未检测到"), "good");
  const native =
    d.countryCode && d.registered_country_code && !d.is_public_service
      ? chip(
          d.countryCode.toLowerCase() ===
            d.registered_country_code.toLowerCase()
            ? t("原生 IP")
            : t("注册地不同"),
          d.countryCode.toLowerCase() ===
            d.registered_country_code.toLowerCase()
            ? "good"
            : "warn",
          t("根据注册国家与定位国家是否一致判断"),
        )
      : chip(t("未知"));
  const number = (value?: number) =>
    typeof value === "number" && Number.isFinite(value) ? (
      <NumberTicker
        value={value}
        formatValue={(v) => Math.round(v).toLocaleString()}
      />
    ) : (
      "—"
    );
  const seen = (value?: number) =>
    value ? new Date(value * 1000).toLocaleDateString() : "—";
  const score =
    typeof d.trust_score === "number" &&
    Number.isFinite(d.trust_score) &&
    d.trust_score >= 0 &&
    d.trust_score <= 100
      ? d.trust_score
      : null;
  const rpki: Record<string, string> = {
    valid: t("有效"),
    invalid: t("无效"),
    notfound: t("未声明 ROA"),
    unknown: t("未知"),
  };
  return (
    <div className="ip-dossier">
      <div className="ip-dossier-top">
        <div className="ip-dossier-head">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="min-w-0 break-all text-xl font-semibold">
                <IpText ip={d.ip} link={false} />
              </h2>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={hidden ? t("显示 IP 地址") : t("隐藏 IP 地址")}
                  title={hidden ? t("显示 IP 地址") : t("隐藏 IP 地址")}
                  aria-pressed={hidden}
                  onClick={() => setHidden((value) => !value)}
                >
                  {hidden ? (
                    <EyeOff aria-hidden="true" />
                  ) : (
                    <Eye aria-hidden="true" />
                  )}
                </Button>
                <CopyButton value={d.ip} />
              </div>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <CountryFlag code={data.geo.country_code} />
              <span>
                {[d.country, d.region, d.city, d.isp]
                  .filter(Boolean)
                  .filter((v, i, all) => all.indexOf(v) === i)
                  .join(" · ")}
              </span>
            </div>
          </div>
          <div
            className="ip-reputation-badge"
            style={{ color: ipScoreColor(score) }}
          >
            <span>{t("IP 信誉分")}</span>
            <strong>
              {score == null ? "—" : <NumberTicker value={score} />}
            </strong>
          </div>
        </div>
        {search}
        {recent}
      </div>
      <div className="ip-dossier-grid">
        <ToolCard title={t("使用场景 / 类型")}>
          <IpFacts
            rows={[
              [t("IP 原生性"), native],
              [
                t("标记"),
                d.is_public_service
                  ? chip(t("公共服务"))
                  : d.isResidential === true
                    ? chip(t("家庭住宅 IP"), "residential")
                    : d.is_datacenter === true
                      ? chip(t("数据中心"))
                      : chip(t("未知")),
              ],
              [t("注册国家"), d.registered_country],
              [t("数据中心"), yesNo(d.is_datacenter)],
              [t("移动网络"), yesNo(d.is_mobile)],
              [
                t("企业类型"),
                d.company_type ? (
                  <Badge
                    variant="secondary"
                    className={
                      companyTypeColors[d.company_type.toLowerCase()] ??
                      "bg-primary/5 text-primary"
                    }
                  >
                    {d.company_type}
                  </Badge>
                ) : undefined,
              ],
              [t("企业信息"), d.company_name],
              [t("机房名称"), d.datacenter_name || "—"],
            ]}
          />
        </ToolCard>
        <ToolCard title={t("ASN / 运营商")}>
          <IpFacts
            rows={[
              ["ASN", d.asn ? `AS${d.asn}` : undefined],
              [t("服务商"), d.isp],
              [t("ASN 归属"), d.asname],
              [t("ASN 组织"), d.asOrganization],

              ["CIDR", d.cidr],
              [t("ASN 自报类型"), d.asn_kind],
              [t("ASN IPv4 总量"), number(d.asn_ipv4_count)],
              [t("ASN 注册日期"), d.asn_allocated],
            ]}
          />
        </ToolCard>
        <ToolCard title={t("技术指标")}>
          <IpFacts
            rows={[
              [t("地址类型"), d.ip.includes(":") ? "IPv6" : "IPv4"],
              [
                t("IP 范围"),
                d.range?.first && d.range?.last
                  ? `${d.range.first} – ${d.range.last}`
                  : undefined,
              ],
              [t("地址数量"), number(d.range?.count)],
              [t("预估带宽"), d.asn_tbps],
              ["Bogon", riskFlag(d.is_bogon)],
              [t("Reddit 限制"), riskFlag(d.reddit_blocked)],
              ["PTR", d.rdns],
              [
                "RPKI",
                d.rpki_status
                  ? (rpki[d.rpki_status.toLowerCase()] ?? d.rpki_status)
                  : t("未知"),
              ],
            ]}
          />
        </ToolCard>
        <ToolCard title={t("风险深度检测")}>
          <IpFacts
            rows={[
              ["VPN", riskFlag(d.is_vpn)],
              [t("代理"), riskFlag(d.is_proxy)],
              ["Tor", riskFlag(d.is_tor)],
              [t("爬虫标记"), riskFlag(d.is_crawler)],
              [t("滥用标记"), riskFlag(d.is_abuser)],
              [
                t("滥用评分"),
                d.intelligence?.abuser_score_raw ?? d.abuser_score,
              ],
            ]}
          />
        </ToolCard>
      </div>
      <ToolCard title={t("IP 情报（威胁指标）")}>
        <IpFacts
          rows={[
            [
              t("风险标记"),
              Array.isArray(d.intelligence?.threats)
                ? d.intelligence.threats.length
                  ? chip(d.intelligence.threats.join(" · "), "bad")
                  : chip(t("未发现明显威胁"), "good")
                : chip(t("未知")),
            ],
            [t("滥用等级"), d.intelligence?.abuser_level],
            [
              t("HTTP 蜜罐黑名单"),
              d.intelligence?.rep_threat == null
                ? chip(t("未知"))
                : JSON.stringify(d.intelligence.rep_threat),
            ],
            [
              t("VPN 线索"),
              d.vpn_trace == null
                ? "—"
                : typeof d.vpn_trace === "string"
                  ? d.vpn_trace
                  : JSON.stringify(d.vpn_trace),
            ],
            [t("访问评估"), d.ai_verdict?.label],
            [
              t("评估置信度"),
              d.ai_verdict?.confidence == null ? (
                "—"
              ) : (
                <span key="confidence">{number(d.ai_verdict.confidence)}%</span>
              ),
            ],
            [t("评估依据"), d.ai_verdict?.reasoning],
          ]}
        />
      </ToolCard>
      <ToolCard title={t("地理位置 · 多源对比")}>
        <DataTable<Geo>
          className="ip-geo-table"
          columns={[
            { accessorKey: "source", header: t("数据来源") },
            { accessorKey: "country", header: t("国家 / 地区") },
            { accessorKey: "region", header: t("地区") },
            {
              accessorKey: "city",
              header: t("城市"),
              cell: ({ row }) => (
                <span className="ip-geo-city" title={row.original.city}>
                  {row.original.city ?? "—"}
                </span>
              ),
            },
            { accessorKey: "latitude", header: t("纬度") },
            { accessorKey: "longitude", header: t("经度") },
          ]}
          data={data.sources}
          empty={t("未获取到归属地数据")}
        />
      </ToolCard>
      <IpLatency key={d.ip} ip={d.ip} />
      <LocationMap geo={data.geo} />
      {!!d.related_domains?.length && (
        <ToolCard title={t("关联域名")}>
          <IpFacts
            rows={d.related_domains.map((item) => [item.domain, item.via])}
          />
        </ToolCard>
      )}
      <div className="ip-dossier-grid">
        {!!d.location_history?.length && (
          <ToolCard title={t("位置历史")}>
            <IpFacts
              rows={d.location_history.map((row) => [
                seen(row.seen_at),
                [row.country, row.region, row.city].filter(Boolean).join(" · "),
              ])}
            />
          </ToolCard>
        )}
        {!!d.asn_history?.length && (
          <ToolCard title={t("ASN 历史")}>
            <IpFacts
              rows={d.asn_history.map((row) => [
                seen(row.seen_at),
                `AS${row.asn ?? "—"} · ${row.asn_org ?? "—"}`,
              ])}
            />
          </ToolCard>
        )}
        {!!d.company_history?.length && (
          <ToolCard title={t("企业历史")}>
            <IpFacts
              rows={d.company_history.map((row) => [
                seen(row.seen_at),
                [row.company_name, row.company_type]
                  .filter(Boolean)
                  .join(" · "),
              ])}
            />
          </ToolCard>
        )}
      </div>
      {!!d.dc_neighbors?.length && (
        <ToolCard title={t("关联网络地址")}>
          {mobile ? (
            <ul className="divide-y divide-border/60">
              {d.dc_neighbors.map((row, index) => (
                <li
                  key={`${row.ip}-${index}`}
                  className="min-w-0 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="min-w-0 text-sm font-semibold">
                      <IpText ip={row.ip} />
                    </span>
                    <time
                      className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-muted-foreground"
                      aria-label={t("记录时间")}
                    >
                      {seen(row.seen_at)}
                    </time>
                  </div>
                  {row.city && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.city}
                    </p>
                  )}
                  {row.company && (
                    <p className="mt-1 break-words text-xs leading-relaxed">
                      {row.company}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <DataTable
              columns={[
                {
                  accessorKey: "ip",
                  header: "IP",
                  cell: ({ row }) => <IpText ip={row.original.ip} />,
                },
                { accessorKey: "city", header: t("城市") },
                { accessorKey: "company", header: t("企业信息") },
                {
                  accessorKey: "seen_at",
                  header: t("记录时间"),
                  cell: ({ row }) => seen(row.original.seen_at),
                },
              ]}
              data={d.dc_neighbors}
            />
          )}
        </ToolCard>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link to={`/network/ping/?host=${encodeURIComponent(d.ip)}`}>
            {t("全球延迟测试")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
