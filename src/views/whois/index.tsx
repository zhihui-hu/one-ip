import { useSearchParams } from "react-router-dom";
import { LookupFaq } from "@/components/lookup-faq";
import { LookupForm } from "@/components/lookup-form";
import {
  PageHeading,
  ToolCard,
  Facts,
  ErrorNotice,
  Pending,
} from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useLookupHistory } from "@/hooks/use-lookup-history";
import { t, locale } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import type { Registration } from "./api";
import { lookupWhois } from "./api";

export default function WhoisPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const history = useLookupHistory<Registration>("ip-tools:whois-history:v1");
  const cached = history.find(q);
  const query = useQuery({
    queryKey: ["whois", q],
    enabled: !!q,
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.savedAt,
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      const result = await lookupWhois(q, signal);
      history.save(q, result);
      return result;
    },
    retry: false,
  });
  const data = query.data?.data;
  return (
    <div className="lookup-page">
      <div className="lookup-search-card">
        <PageHeading
          title={t("WHOIS 查询")}
          description={t("查询域名、IP 或 ASN 注册信息")}
        />
        <LookupForm
          grouped
          value={q}
          placeholder={t("输入域名、IP 地址或 AS 号")}
          busy={query.isFetching}
          onSubmit={(value) =>
            value === q ? void query.refetch() : setParams({ q: value })
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
              : ["qq.com", "1.1.1.1", "AS15169"]
            ).map((value) => (
              <Badge key={value} variant="secondary" asChild>
                <button
                  type="button"
                  className="cursor-pointer rounded-md px-2 py-1 h-auto hover:bg-accent"
                  onClick={() => setParams({ q: value })}
                >
                  {value}
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
          <Pending>{t("正在向注册局查询…")}</Pending>
        </p>
      )}
      {data && (
        <div className="lookup-results">
          <h2 className="whois-result-name">
            {data.ldhName ?? data.name ?? q}
          </h2>
          <div className="whois-grid">
            <ToolCard title={t("基础信息")}>
              <Facts
                rows={[
                  [
                    t("查询协议"),
                    query.data?.source ? t(query.data.source) : undefined,
                  ],
                  [t("对象类型"), data.objectClassName],
                  [t("标识符"), data.handle],
                  [t("国家 / 地区"), data.country],
                  ...(data.startAddress
                    ? [
                        [
                          t("地址范围"),
                          `${data.startAddress} – ${data.endAddress}`,
                        ] as [string, string],
                      ]
                    : []),
                ]}
              />
            </ToolCard>
            {data.events?.length ? (
              <ToolCard title={t("注册时间")}>
                <Facts
                  rows={data.events.map((event) => [
                    event.eventAction,
                    new Date(event.eventDate).toLocaleString(locale),
                  ])}
                />
              </ToolCard>
            ) : null}
            {data.status?.length ? (
              <ToolCard title={t("域名状态")}>
                <div className="whois-tags">
                  {data.status.map((status) => (
                    <Badge variant="secondary" key={status}>
                      {status}
                    </Badge>
                  ))}
                </div>
              </ToolCard>
            ) : null}
            {data.nameservers?.length ? (
              <ToolCard title={t("DNS 服务器")}>
                <div className="whois-tags">
                  {data.nameservers.map((server, index) => (
                    <Badge variant="secondary" key={index}>
                      {server.ldhName}
                    </Badge>
                  ))}
                </div>
              </ToolCard>
            ) : null}
            {data.entities?.map((entity, index) => (
              <ToolCard
                key={index}
                title={entity.roles?.join(" / ") ?? t("注册实体")}
              >
                <Facts rows={[[t("标识符"), entity.handle ?? t("隐私保护")]]} />
              </ToolCard>
            ))}
          </div>
          <details className="raw-details">
            <summary>{t("查看原始 RDAP 数据")}</summary>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </details>
        </div>
      )}
      <LookupFaq
        items={[
          {
            title: t("可以查询哪些内容？"),
            text: t(
              "支持域名、公网 IPv4、IPv6 和 AS 号（例如 AS15169）。域名只需填写名称，不要包含 https://、端口或路径。\n\n例如 qq.com、1.1.1.1、AS15169。查询 www.qq.com 等子域名不一定能得到独立注册记录；通常应输入实际注册的域名 qq.com。",
            ),
          },
          {
            title: t("WHOIS 和 RDAP 有什么区别？"),
            text: t(
              "两者都用于查询注册信息。本页使用返回结构化数据的 RDAP；域名由注册局提供数据，IP 和 ASN 由区域互联网注册机构提供数据。\n\n页面会按响应展示标识符、状态、名称服务器、事件时间及实体信息，不同注册机构提供的字段可能不同。原始 RDAP 数据入口可用于核对完整响应。",
            ),
          },
          {
            title: t("为什么查询失败或没有结果？"),
            text: t(
              "域名后缀可能尚无可用 RDAP 服务，也可能遇到未注册域名、上游限流或连接超时。查询失败不代表域名可以注册，请以注册商结果为准。\n\n先检查拼写和输入格式，再尝试原条件重新查询。若仅某个后缀失败，可能是该注册局服务不支持或暂不可用；不要通过反复高频点击来绕过上游限流。",
            ),
          },
          {
            title: t("为什么看不到注册人或国家信息？"),
            text: t(
              "上游可能未公开相关字段，或对联系人信息作了隐私处理。“未知”仅表示此次响应没有提供数据。\n\n域名记录中的国家通常属于注册或联系信息，不能用来判断网站服务器所在地。联系人标识符也未必是姓名；隐私代理或注册商实体可能代替注册人出现在响应中。",
            ),
          },
          {
            title: t("域名状态与 DNS 服务器代表什么？"),
            text: t(
              "transfer prohibited 表示限制转移，delete prohibited 表示限制删除，hold 表示暂停解析。DNS 服务器字段列出注册信息中的权威名称服务器，不代表当前网站服务器 IP。\n\nclient 前缀一般表示注册商设置的限制，server 前缀一般表示注册局设置的限制。转移锁并不表示网站不可访问；名称服务器列表也不直接表示你当前使用的递归 DNS。",
            ),
          },
          {
            title: t("最近查询会自动更新吗？"),
            text: t(
              "本浏览器分别保留最近 10 条 IP 和 WHOIS 成功查询。点击历史优先显示已保存结果及时间；需要最新信息时，再点击“查询”。清除站点数据会删除本地历史。\n\n同一查询成功更新后会覆盖旧结果并排到前面，超过 10 条会移除最早保存的记录。缓存不会后台自动更新，注册状态、DNS 或到期日期发生变化时应主动重新查询。",
            ),
          },
        ]}
      />
    </div>
  );
}
