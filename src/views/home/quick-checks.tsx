import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CompactText } from "@/components/compact-text";
import { IpText, Pending } from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group";
import { UnderlineHover } from "@/components/underline-hover";
import { request } from "@/lib/network";
import { runWebRtc } from "@/views/webrtc/api";
import { useQuery } from "@tanstack/react-query";

export function QuickChecks() {
  const navigate = useNavigate();
  const [target, setTarget] = useState("");
  const [started, setStarted] = useState(false);
  const dns = useQuery({
    queryKey: ["home-dns"],
    enabled: started,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      const token = crypto.randomUUID().replaceAll("-", "");
      const data = await request<{ dns?: { ip: string; geo: string } }>(
        `https://${token}.edns.ip-api.com/json`,
        { signal, cache: "no-store" },
      );
      if (!data.dns?.ip) throw new Error("未获取到 DNS 出口");
      return data.dns;
    },
  });
  const rtc = useQuery({
    queryKey: ["home-webrtc"],
    enabled: started,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) => runWebRtc(undefined, signal),
  });
  const busy = dns.isFetching || rtc.isFetching;
  return (
    <div className="grid grid-cols-1 gap-3 mb-3 md:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="row-between">
            <CardTitle>DNS / WebRTC 出口</CardTitle>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                if (started) {
                  void dns.refetch();
                  void rtc.refetch();
                } else setStarted(true);
              }}
            >
              {busy ? (
                <Pending>检测中…</Pending>
              ) : started ? (
                "重新检测"
              ) : (
                "一键检测"
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between gap-3 py-2 text-sm">
            <UnderlineHover asChild>
              <Link className="shrink-0 text-primary" to="/network/dns">
                DNS 出口
              </Link>
            </UnderlineHover>
            <span className="min-w-0">
              {!started ? (
                "未检测"
              ) : dns.isFetching ? (
                <Pending>采样中…</Pending>
              ) : dns.data ? (
                <IpText ip={dns.data.ip} />
              ) : (
                "暂不可用"
              )}
            </span>
          </div>
          <div className="flex justify-between gap-3 py-2 text-sm">
            <UnderlineHover asChild>
              <Link className="shrink-0 text-primary" to="/browser/privacy">
                WebRTC
              </Link>
            </UnderlineHover>
            <span className="min-w-0">
              {!started ? (
                "未检测"
              ) : rtc.isFetching ? (
                <Pending>采样中…</Pending>
              ) : rtc.data ? (
                <CompactText text={rtc.data.verdict} />
              ) : (
                "暂不可用"
              )}
            </span>
          </div>
          {dns.data && (
            <p className="small muted mt-2">
              <CompactText text={dns.data.geo} />
            </p>
          )}
          <p className="small muted mt-3">
            DNS 单次采样；未采集到地址不代表没有泄漏，点击查看完整检测。
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>全球 Ping / 地址查询</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (target.trim())
                navigate(
                  `/network/ping?host=${encodeURIComponent(target.trim())}`,
                );
            }}
          >
            <InputGroup>
              <InputGroupInput
                aria-label="快速查询 IP 或域名"
                placeholder="输入 IP 或域名"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
              />
              {target.trim() && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton type="submit" variant="ghost">
                    全球 Ping
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(
                    target.trim()
                      ? `/network/ip/${encodeURIComponent(target.trim())}`
                      : "/network/ip",
                  )
                }
              >
                IP 信息
              </Button>
              <Button type="button" variant="outline" size="sm" asChild>
                <Link
                  to={
                    target.trim()
                      ? `/network/whois?q=${encodeURIComponent(target.trim())}`
                      : "/network/whois"
                  }
                >
                  WHOIS 查询
                </Link>
              </Button>
            </div>
          </form>
          <p className="small muted mt-3">
            进入详情后选择地区并开始测量，默认优选模式。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
