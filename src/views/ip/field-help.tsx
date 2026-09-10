import { useState, type ReactNode } from "react";
import { Facts } from "@/components/toolkit";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { t } from "@/i18n";
import { Info } from "lucide-react";

const definitions = new Map([
  [
    "ASN",
    t("自治系统编号，用于标识对外宣告 IP 路由的网络组织，不等同于最终使用者。"),
  ],
  [
    "CIDR",
    t(
      "无类别域间路由记法，表示 IP 地址块。斜杠后的数字越小，范围越大；IPv4 /24 包含 256 个地址，/16 包含 65,536 个地址。",
    ),
  ],
  [
    "PTR",
    t(
      "反向 DNS 记录，将 IP 地址映射为域名。名称由网络运营方配置，不能单独证明住宅或机房属性。",
    ),
  ],
  [
    "RPKI",
    t(
      "验证 IP 前缀与宣告 ASN 是否获得路由授权。有效表示匹配 ROA；未声明表示没有相关授权记录，不等于无效或存在威胁。",
    ),
  ],
  [
    "Bogon",
    t(
      "私有、保留或未分配等不应出现在公共互联网路由中的地址。未命中不代表该地址一定可访问。",
    ),
  ],
  [
    "VPN",
    t(
      "该地址是否被识别为 VPN 出口。VPN 标记不等于恶意行为，未检测到也不保证没有使用 VPN。",
    ),
  ],
  [
    "Tor",
    t(
      "该地址是否被识别为 Tor 出口节点。此标记反映网络出口属性，不代表用户身份。",
    ),
  ],
  [
    t("IP 原生性"),
    t(
      "根据注册国家与定位国家是否一致判断。一致时显示原生 IP；国家不同也可能来自跨境运营或数据库差异。",
    ),
  ],
  [
    t("ASN 自报类型"),
    t(
      "网络组织申报的业务类型，例如 mixed 为混合网络、hosting 为托管网络；不能直接代表某一个 IP 的实际用途。",
    ),
  ],
  [
    t("ASN IPv4 总量"),
    t(
      "该 ASN 关联的 IPv4 地址数量，不是当前地址段的大小，也不代表在线设备数量。",
    ),
  ],
  [
    t("预估带宽"),
    t("网络组织层面的带宽估计或申报档位，不是当前 IP 的实测下载速度。"),
  ],
  [
    t("ASN 注册日期"),
    t("ASN 的注册或分配日期，不是当前 IP 地址块、宽带账户或设备的启用日期。"),
  ],
  [
    t("代理"),
    t("该 IP 是否被识别为代理出口。检测结果可能受数据库覆盖和更新时间影响。"),
  ],
  [
    t("HTTP 蜜罐黑名单"),
    t(
      "蜜罐记录扫描、攻击或自动化访问等活动形成的威胁信号。没有返回数据时显示未知，不能理解为未命中。",
    ),
  ],
  [
    t("滥用评分"),
    t(
      "反映数据源记录的滥用信号强弱；分值及等级使用该字段自身的尺度，不等于顶部的 0–100 信誉分。",
    ),
  ],
  [
    t("评估置信度"),
    t(
      "数据源对其访问评估的置信程度，不是服务可用率，也不是成功访问 AI 平台的概率。",
    ),
  ],
  [
    t("关联网络地址"),
    t(
      "数据源关联到的其他网络地址，不代表与当前 IP 属于同一台服务器或同一位用户。",
    ),
  ],
  [
    t("IP 信誉分"),
    t(
      "0–100 的综合信誉指标，越高表示数据源评估的风险越低。该分数不能保证网站可用，也不能代表任何 AI 平台的官方判定。",
    ),
  ],
]);

export function FieldHelp({ label }: { label: string }) {
  const mobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const description = definitions.get(label);
  if (!description) return <>{label}</>;
  const trigger = (
    <button
      type="button"
      className="ip-help-trigger"
      aria-label={t("解释 {0}", [label])}
      onClick={mobile ? () => setOpen(true) : undefined}
    >
      <Info aria-hidden="true" size={14} />
    </button>
  );
  return (
    <span className="ip-field-label">
      {label}
      {mobile ? (
        <>
          {trigger}
          <ResponsiveDialog
            open={open}
            onOpenChange={setOpen}
            title={label}
            description=""
          >
            <p className="text-sm leading-relaxed">{description}</p>
          </ResponsiveDialog>
        </>
      ) : (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent
              sideOffset={6}
              className="max-w-72 text-xs leading-relaxed"
            >
              {description}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </span>
  );
}
export function IpFacts({ rows }: { rows: [string, ReactNode][] }) {
  const compactLabels = new Set([
    "ASN",
    "VPN",
    "Tor",
    "Bogon",
    "RPKI",
    t("IP 原生性"),
    t("标记"),
    t("注册国家"),
    t("数据中心"),
    t("移动网络"),
    t("企业类型"),
    t("地址类型"),
    t("地址数量"),
    t("代理"),
    t("爬虫标记"),
    t("滥用标记"),
    t("Reddit 限制"),
    t("滥用等级"),
    t("评估置信度"),
  ]);
  const compact = new Set<string>();
  const fits = ([label, value]: [string, ReactNode]) =>
    compactLabels.has(label) &&
    (typeof value !== "string" || value.length <= 12);
  for (let i = 0; i < rows.length - 1; i++) {
    if (fits(rows[i]) && fits(rows[i + 1])) {
      compact.add(rows[i][0]);
      compact.add(rows[i + 1][0]);
      i++;
    }
  }
  const important = new Set([
    "ASN",
    "CIDR",
    t("服务商"),
    t("标记"),
    t("IP 原生性"),
    t("风险标记"),
  ]);
  return (
    <Facts
      rows={rows.map(([label, value]) => [
        label,
        important.has(label) ? (
          <span key={label} className="ip-key-value">
            {value}
          </span>
        ) : (
          value
        ),
      ])}
      renderLabel={(label) => (
        <span className={compact.has(label) ? "ip-compact-field" : undefined}>
          <FieldHelp label={label} />
        </span>
      )}
    />
  );
}
