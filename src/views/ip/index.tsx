import { Link, useNavigate, useParams } from "react-router-dom";
import { LookupFaq } from "@/components/lookup-faq";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLookupHistory } from "@/hooks/use-lookup-history";
import { t, locale } from "@/i18n";
import type { Lookup } from "@/lib/types";
import type { Geo } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { lookupIp } from "./api";
import { LocationMap } from "./location-map";

const columns: ColumnDef<Geo>[] = [
  { accessorKey: "source", header: t("数据源") },
  { accessorKey: "country", header: t("国家 / 地区") },
  { accessorKey: "city", header: t("城市") },
  { accessorKey: "isp", header: t("运营商") },
  { accessorKey: "asn", header: "ASN" },
];
export default function IpPage() {
  const { ip = "" } = useParams();
  const navigate = useNavigate();
  const history = useLookupHistory<Lookup>("ip-tools:ip-history:v1");
  const cached = history.find(ip);
  const query = useQuery({
    queryKey: ["lookup-ip", ip],
    enabled: !!ip,
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.savedAt,
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      const result = await lookupIp(ip, signal);
      history.save(ip, result);
      return result;
    },
    retry: false,
  });
  const data = query.data;
  return (
    <div className="lookup-page">
      <div className="lookup-search-card">
        <PageHeading
          title={t("IP 信息查询")}
          description={t("归属地、运营商与注册信息")}
        />
        <LookupForm
          grouped
          value={ip}
          placeholder={t("输入 IPv4 或 IPv6 地址")}
          busy={query.isFetching}
          onSubmit={(value) =>
            value === ip
              ? void query.refetch()
              : navigate(`/network/ip/${encodeURIComponent(value)}`)
          }
        />
      </div>
      <Card className="mt-3">
        <CardContent>
          <div className="examples lookup-history">
            <span>
              {history.entries.length ? t("最近查询") : t("推荐查询")}
            </span>
            {(history.entries.length
              ? history.entries.map((entry) => entry.query)
              : ["1.1.1.1", "8.8.8.8", "223.5.5.5"]
            ).map((value) => (
              <Badge key={value} variant="secondary" asChild>
                <button
                  type="button"
                  className="cursor-pointer rounded-md px-2 py-1 h-auto hover:bg-accent"
                  onClick={() =>
                    navigate(`/network/ip/${encodeURIComponent(value)}`)
                  }
                >
                  <IpText ip={value} link={false} />
                </button>
              </Badge>
            ))}
          </div>
          {cached && (
            <p className="small muted">
              {t("已保存的查询结果 ·")}{" "}
              {new Date(cached.savedAt).toLocaleString(locale)}
              {t("，点击查询可更新")}
            </p>
          )}
        </CardContent>
      </Card>
      <ErrorNotice error={query.error} />
      {query.isFetching && (
        <p className="status-line">
          <Pending>{t("正在查询多源 IP 情报…")}</Pending>
        </p>
      )}
      {data && (
        <div className="lookup-results">
          <div className="result-title">
            <h2>
              <IpText ip={data.geo.ip} link={false} />
            </h2>
            <Button variant="outline" asChild>
              <Link
                to={`/network/ping/?host=${encodeURIComponent(data.geo.ip)}`}
              >
                {t("全球延迟测试")}
              </Link>
            </Button>
          </div>
          <div className="ip-result-grid">
            {data.risk.available && (
              <ToolCard title={t("风险评分")}>
                <div className="gauge-score">
                  {data.risk.available ? (data.risk.fraud_score ?? "—") : "—"}
                </div>
                <p className="small muted">
                  {data.risk.available
                    ? t("{0} · 风险越低越好", [data.risk.source])
                    : data.risk.reason}
                </p>
              </ToolCard>
            )}
            {data.risk.available && (
              <ToolCard title={t("使用场景 / 类型")}>
                <Facts
                  rows={[
                    [t("IP 属性"), data.risk.connection_type ?? t("未提供")],
                    [
                      "VPN",
                      data.risk.vpn == null
                        ? t("未知")
                        : data.risk.vpn
                          ? t("是")
                          : t("否"),
                    ],
                    [
                      t("代理"),
                      data.risk.proxy == null
                        ? t("未知")
                        : data.risk.proxy
                          ? t("是")
                          : t("否"),
                    ],
                  ]}
                />
              </ToolCard>
            )}
            <ToolCard title={t("ASN / 运营商")}>
              <Facts
                rows={[
                  ["ASN", data.geo.asn],
                  [t("运营商"), data.geo.isp],
                  [t("时区"), data.geo.timezone],
                ]}
              />
            </ToolCard>
            <ToolCard title={t("技术指标")}>
              <Facts
                rows={[
                  [t("地址类型"), data.geo.ip.includes(":") ? "IPv6" : "IPv4"],
                  [t("经度"), data.geo.longitude],
                  [t("纬度"), data.geo.latitude],
                ]}
              />
            </ToolCard>
            {data.risk.available && (
              <ToolCard title={t("IP 情报（威胁指标）")}>
                <Facts
                  rows={[
                    [
                      "Tor",
                      data.risk.tor == null
                        ? t("未知")
                        : data.risk.tor
                          ? t("是")
                          : t("否"),
                    ],
                    [
                      t("机器人"),
                      data.risk.bot_status == null
                        ? t("未知")
                        : data.risk.bot_status
                          ? t("是")
                          : t("否"),
                    ],
                    [
                      t("近期滥用"),
                      data.risk.recent_abuse == null
                        ? t("未知")
                        : data.risk.recent_abuse
                          ? t("是")
                          : t("否"),
                    ],
                  ]}
                />
              </ToolCard>
            )}
            {data.rdap && (
              <ToolCard title={t("注册信息（RDAP）")}>
                <Button variant="outline" asChild>
                  <Link to={`/network/whois/?q=${encodeURIComponent(ip)}`}>
                    {t("查看完整注册信息")}
                  </Link>
                </Button>
              </ToolCard>
            )}
          </div>
          <LocationMap geo={data.geo} />
          <ToolCard title={t("地理位置 · 多源对比")}>
            <DataTable
              columns={columns}
              data={data.sources}
              empty={t("未获取到归属地数据")}
            />
          </ToolCard>
        </div>
      )}
      <LookupFaq
        items={[
          {
            title: t("支持哪些 IP 地址？"),
            text: t(
              "支持公网 IPv4 和 IPv6。请只输入地址，不要附加协议、端口或路径；私有、回环及保留地址无法进行公网归属查询。\n\n例如 1.1.1.1、8.8.8.8；IPv6 可直接粘贴完整地址。192.168.x.x、10.x.x.x 和 127.0.0.1 等地址只在本地网络中有意义，不能据此判断公网位置。",
            ),
          },
          {
            title: t("为什么多个数据源给出的归属地不同？"),
            text: t(
              "各数据源的采集方式和更新时间不同。IP 归属地是网络地址的估计位置，不等同于设备的精确位置；运营商名称也可能显示机房或上游网络。\n\n判断时可以对比国家、城市、运营商和 ASN，而不要只看城市名称。代理、移动网络、云服务器及地址重新分配都可能使数据库记录与实际使用位置存在差异。",
            ),
          },
          {
            title: t("ASN、运营商和地址类型分别是什么？"),
            text: t(
              "ASN 标识负责路由该地址的自治系统；运营商表示数据源记录的网络组织；IPv4、IPv6 表示地址协议版本。\n\n同一运营商可能拥有多个 ASN，同一 ASN 也可能覆盖多个城市。注册组织、路由运营方和最终使用者并不总是同一个主体，因此组织名称不等于设备或用户身份。",
            ),
          },
          {
            title: t("为什么风险评分或部分字段没有显示？"),
            text: t(
              "只有数据源实际返回的信息才会展示。缺少风险评分、经纬度或代理标记，不表示该 IP 安全，也不表示它一定存在风险。\n\n评分和 VPN、代理等标记属于特定数据源的判断，不能作为单独的安全结论。字段缺失可能是数据源未提供、查询失败或服务未配置；不要把“未知”解读成“否”或零风险。",
            ),
          },
          {
            title: t("如何查看当前网络的出口 IP？"),
            text: t(
              "首页的 IPv4、IPv6 卡片会通过浏览器检测当前出口。需要查看详细归属信息时，可以点击地址进入 IP 信息页。\n\n使用代理或分流时，不同网站可能走不同出口。可结合首页的网站分流结果，选择需要查询的具体地址。",
            ),
          },
          {
            title: t("最近查询保存在哪里，如何更新？"),
            text: t(
              "本浏览器保留最近 10 条成功查询及结果，点击历史直接读取缓存，再点击“查询”可更新。\n\n历史保存在当前浏览器的 localStorage，不会在设备间同步。清除本站数据可移除本地历史；查询地址也可能出现在地址栏与浏览器历史中。",
            ),
          },
        ]}
      />
    </div>
  );
}
