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
import { t } from "@/i18n";
import { sampleDnsExit } from "@/views/dns-exit/api";
import { runWebRtc } from "@/views/webrtc/api";
import { useQuery } from "@tanstack/react-query";

export function QuickChecks() {
  const navigate = useNavigate();
  const [target, setTarget] = useState("");
  const dns = useQuery({
    queryKey: ["home-dns"],
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) => sampleDnsExit(signal),
  });
  const rtc = useQuery({
    queryKey: ["home-webrtc"],
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
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{t("home.dnsWebrtcEgress")}</CardTitle>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                void dns.refetch();
                void rtc.refetch();
              }}
            >
              {busy ? (
                <Pending>{t("common.checking")}</Pending>
              ) : (
                t("common.runAgain")
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between gap-3 py-2 text-sm">
            <UnderlineHover asChild>
              <Link
                className="shrink-0 text-muted-foreground"
                to="/network/dns"
              >
                {t("common.dnsEgress")}
              </Link>
            </UnderlineHover>
            <span className="min-w-0 text-muted-foreground">
              {dns.isFetching ? (
                <Pending>{t("home.sampling")}</Pending>
              ) : dns.data ? (
                <IpText ip={dns.data.ip} />
              ) : (
                t("common.unavailable")
              )}
            </span>
          </div>
          <div className="flex justify-between gap-3 py-2 text-sm">
            <UnderlineHover asChild>
              <Link
                className="shrink-0 text-muted-foreground"
                to="/browser/privacy"
              >
                WebRTC
              </Link>
            </UnderlineHover>
            <span className="min-w-0 text-muted-foreground">
              {rtc.isFetching ? (
                <Pending>{t("home.sampling")}</Pending>
              ) : rtc.data ? (
                <CompactText text={rtc.data.verdict} />
              ) : (
                t("common.unavailable")
              )}
            </span>
          </div>
          {dns.data && (
            <p className="mt-2 text-[0.78rem] text-muted-foreground">
              <CompactText text={dns.data.geo} />
            </p>
          )}
          <p className="mt-3 text-[11px] leading-[1.65] font-normal text-subtle">
            {t("home.oneDnsSampleAddressCollectedDoesRuleOut")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("home.globalPingAddressLookup")}</CardTitle>
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
                aria-label={t("home.quickIpOrDomainLookup")}
                placeholder={t("home.enterAnIpOrDomain")}
                value={target}
                onChange={(event) => setTarget(event.target.value)}
              />
              {target.trim() && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton type="submit" variant="ghost">
                    {t("common.globalPing")}
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
                      ? `/lookup/ip/${encodeURIComponent(target.trim())}`
                      : "/lookup/ip",
                  )
                }
              >
                {t("home.ipDetails")}
              </Button>
              <Button type="button" variant="outline" size="sm" asChild>
                <Link
                  to={
                    target.trim()
                      ? `/lookup/whois?q=${encodeURIComponent(target.trim())}`
                      : "/lookup/whois"
                  }
                >
                  {t("common.whoisLookup")}
                </Link>
              </Button>
            </div>
          </form>
          <p className="mt-3 text-[11px] leading-[1.65] font-normal text-subtle">
            {t("home.chooseRegionsStartMeasuringDetailsPageOptimizedMode")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
