import { useSearchParams } from "react-router-dom";
import { Explanation } from "@/components/explanation";
import { LookupForm } from "@/components/lookup-form";
import {
  PageHeading,
  ToolCard,
  Facts,
  ErrorNotice,
  Pending,
} from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { atom } from "jotai";
import { lookupWhois } from "./api";

const expandedAtom = atom(false);
const suffixes = [
  ".com",
  ".net",
  ".org",
  ".cn",
  ".io",
  ".ai",
  ".dev",
  ".app",
  ".co",
  ".me",
  ".xyz",
  ".top",
  ".info",
  ".biz",
  ".uk",
  ".de",
  ".jp",
  ".fr",
  ".au",
  ".ca",
  ".us",
  ".edu",
];
export default function WhoisPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [expanded, setExpanded] = useAtom(expandedAtom);
  const query = useQuery({
    queryKey: ["whois", q],
    enabled: !!q,
    queryFn: ({ signal }) => lookupWhois(q, signal),
    retry: false,
  });
  const data = query.data?.data;
  return (
    <>
      <PageHeading
        title="WHOIS 查询"
        description="域名Whois、IP Whois 或 AS 号，一键查询注册商、日期、DNS 服务器、域名状态与归属信息。含 RDAP 现代协议数据"
      />
      <LookupForm
        value={q}
        placeholder="输入域名、IP 地址或 AS 号"
        busy={query.isFetching}
        onSubmit={(value) => setParams({ q: value })}
      />
      <div className="examples">
        示例：
        {["qq.com", "x.ai", "1.1.1.1", "AS15169"].map((value) => (
          <Button
            key={value}
            variant="ghost"
            size="sm"
            onClick={() => setParams({ q: value })}
          >
            {value}
          </Button>
        ))}
      </div>
      <ErrorNotice error={query.error} />
      {query.isFetching && (
        <p className="status-line">
          <Pending>正在向注册局查询…</Pending>
        </p>
      )}
      {data && (
        <div className="lookup-results">
          <ToolCard title={data.ldhName ?? data.name ?? q}>
            <Facts
              rows={[
                ["查询协议", query.data?.source],
                ["对象类型", data.objectClassName],
                ["标识符", data.handle],
                ["国家 / 地区", data.country],
                [
                  "地址范围",
                  data.startAddress
                    ? `${data.startAddress} – ${data.endAddress}`
                    : "—",
                ],
                ["域名状态", data.status?.join(" · ")],
                [
                  "DNS 服务器",
                  data.nameservers?.map((n) => n.ldhName).join(" · "),
                ],
                ...(data.events ?? []).map(
                  (event) =>
                    [
                      event.eventAction,
                      new Date(event.eventDate).toLocaleString("zh-CN"),
                    ] as [string, string],
                ),
              ]}
            />
          </ToolCard>
          {data.entities?.length ? (
            <ToolCard title="注册局 / 联系实体">
              <Facts
                rows={data.entities.map((entity, i) => [
                  `${entity.roles?.join(" / ") ?? "实体"} ${i + 1}`,
                  entity.handle ?? "隐私保护",
                ])}
              />
            </ToolCard>
          ) : null}
          <details className="raw-details">
            <summary>查看原始 RDAP 数据</summary>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </details>
        </div>
      )}
      <section className="reading">
        <h2>支持的域名后缀</h2>
        <div className="suffixes">
          {suffixes.slice(0, expanded ? suffixes.length : 10).map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "收起后缀" : "显示更多后缀"}
        </Button>
        <p className="small muted">
          上列为常见后缀；实际可查询范围取决于注册局是否提供 RDAP。
        </p>
      </section>
      <Explanation
        items={[
          {
            title: "WHOIS 和 RDAP 有什么区别？",
            text: "WHOIS 是较早的明文注册查询协议；RDAP 基于 HTTPS，返回结构化 JSON。本项目使用 rdap.org 引导到注册局 RDAP 服务。暂未实现 TCP/43 WHOIS 回退，没有 RDAP 的后缀会明确返回查询失败。",
          },
          {
            title: "为什么有些域名看不到注册人信息？",
            text: "受 GDPR 等隐私法规影响，多数注册局和注册商隐藏个人注册信息，仅保留注册商、日期、DNS 与技术状态。这是正常的隐私保护，不代表查询失败。",
          },
          {
            title: "域名状态代码是什么意思？",
            text: "clientTransferProhibited 通常是注册商转移锁；serverDeleteProhibited 是注册局删除锁；clientHold 表示暂停解析；pendingDelete 表示等待删除。具体解释应以注册局和 ICANN 文档为准。",
          },
          {
            title: "数据来自哪里？多久更新？",
            text: "域名数据来自注册局 RDAP；IP 和 ASN 数据来自区域互联网注册机构。页面每次查询请求真实接口，不把历史抓取内容当作实时注册数据。",
          },
        ]}
      />
    </>
  );
}
