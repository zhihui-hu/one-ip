import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CompactText } from "@/components/compact-text";
import { Pending } from "@/components/toolkit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UnderlineHover } from "@/components/underline-hover";
import { t } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import { fingerprint } from "./collect";

export function BrowserSummary() {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(
    () => typeof window === "undefined" || !("IntersectionObserver" in window),
  );
  useEffect(() => {
    if (visible) return;
    const element = container.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);
  const query = useQuery({
    queryKey: ["home-browser-fingerprint"],
    queryFn: () => fingerprint(),
    enabled: visible,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return (
    <Card ref={container} className="mb-3">
      <CardHeader>
        <div className="row-between">
          <CardTitle>{t("浏览器环境")}</CardTitle>
          <Link className="small muted" to="/browser/environment">
            {t("查看完整检测 ›")}
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
        {((visible && query.isPending) || query.data) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/50 pt-2 text-sm">
            <span className="grow text-muted-foreground">
              {t("浏览器指纹 · Visitor ID")}
            </span>
            {query.isPending ? (
              <Pending>{t("检测中…")}</Pending>
            ) : (
              <Link
                className="max-w-full break-all font-mono text-xs text-primary [.home-page_&]:text-foreground"
                to="/browser/fingerprint"
              >
                {query.data?.visitorId}
              </Link>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm text-primary [.home-page_&]:text-muted-foreground">
          {[
            { path: "fingerprint", name: t("指纹检测") },
            { path: "consistency", name: t("环境一致性") },
            { path: "privacy", name: t("权限与隐私") },
          ].map((tool) => (
            <UnderlineHover asChild key={tool.path}>
              <Link to={`/browser/${tool.path}`}>{tool.name} ›</Link>
            </UnderlineHover>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
