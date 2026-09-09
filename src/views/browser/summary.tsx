import { useState } from "react";
import { Link } from "react-router-dom";
import { CompactText } from "@/components/compact-text";
import { IpText, Pending } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { UnderlineHover } from "@/components/underline-hover";
import { runWebRtc } from "@/views/webrtc/api";
import { useQuery } from "@tanstack/react-query";
import { fingerprint } from "./collect";

export function BrowserSummary() {
  const [showLocal, setShowLocal] = useState(false);
  const rtc = useQuery({
    queryKey: ["webrtc-diagnostic", 0],
    queryFn: ({ signal }) => runWebRtc(undefined, signal),
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const query = useQuery({
    queryKey: ["home-browser-fingerprint"],
    queryFn: fingerprint,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const publicAddresses = rtc.data?.results.filter((row) => row.public) ?? [];
  const localAddresses = rtc.data?.results.filter((row) => !row.public) ?? [];
  return (
    <>
      <Card className="mb-3">
        <CardHeader>
          <div className="row-between">
            <CardTitle>浏览器环境</CardTitle>
            <Link className="small muted" to="/browser/environment">
              查看完整检测 ›
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <p className="small muted break-words">
            {navigator.platform} · {navigator.language} ·{" "}
            {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </p>
          <p className="small muted mt-2">
            <CompactText text={navigator.userAgent} />
          </p>
          {(query.isPending || query.data) && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/50 pt-2 text-sm">
              <span className="grow text-muted-foreground">
                浏览器指纹 · Visitor ID
              </span>
              {query.isPending ? (
                <Pending>检测中…</Pending>
              ) : (
                <Link
                  className="max-w-full break-all font-mono text-xs text-primary"
                  to="/browser/fingerprint"
                >
                  {query.data?.visitorId}
                </Link>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm text-primary">
            {[
              { path: "fingerprint", name: "指纹检测" },
              { path: "consistency", name: "环境一致性" },
              { path: "privacy", name: "权限与隐私" },
            ].map((tool) => (
              <UnderlineHover asChild key={tool.path}>
                <Link to={`/browser/${tool.path}`}>{tool.name} ›</Link>
              </UnderlineHover>
            ))}
          </div>
        </CardContent>
      </Card>
      {(rtc.isPending || Boolean(rtc.data?.results.length)) && (
        <Card className="mb-3">
          <CardHeader>
            <div className="row-between gap-3">
              <CardTitle>WebRTC 出口</CardTitle>
              <Link className="small muted" to="/browser/privacy">
                查看完整检测 ›
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {rtc.isPending ? (
              <Pending>正在检测 WebRTC 出口…</Pending>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="min-w-0 rounded-lg bg-muted/40 p-3">
                    <p className="mb-2 text-xs text-muted-foreground">
                      公网 UDP 出口
                    </p>
                    {publicAddresses.length ? (
                      publicAddresses.map((row) => (
                        <div
                          className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1"
                          key={row.ip}
                        >
                          <span className="min-w-0 break-all text-base font-semibold text-primary">
                            <IpText ip={row.ip} />
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {row.type}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        未采集到公网地址
                      </p>
                    )}
                  </div>
                  {rtc.data?.baseline && (
                    <div className="min-w-0 rounded-lg bg-muted/40 p-3">
                      <p className="mb-2 text-xs text-muted-foreground">
                        HTTP 对照出口
                      </p>
                      <div className="break-all py-1 text-base font-semibold">
                        <IpText ip={rtc.data.baseline.ip} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {!publicAddresses.length
                      ? "暂无公网候选"
                      : !rtc.data?.baseline
                        ? "无法对照"
                        : rtc.data.different
                          ? "出口不同"
                          : "出口一致"}
                  </Badge>
                  {localAddresses.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => setShowLocal(true)}
                    >
                      查看本地地址（{localAddresses.length}）
                    </Button>
                  )}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {rtc.data?.verdict}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}
      <ResponsiveDialog
        open={showLocal}
        onOpenChange={setShowLocal}
        title="WebRTC 本地地址"
        description="浏览器采集到的本地候选地址，不代表公网出口。"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {localAddresses.map((row) => (
            <div
              className="min-w-0 rounded-lg bg-muted/50 px-3 py-2"
              key={row.ip}
            >
              <span className="break-all font-mono text-xs">
                <IpText ip={row.ip} link={false} />
              </span>
            </div>
          ))}
        </div>
      </ResponsiveDialog>
    </>
  );
}
