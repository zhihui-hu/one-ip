import { lazy } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { AppLayout } from "@/layout";
import { browserChecks, legacyRoutes } from "@/layout/routes";
import { ToolLayout } from "@/layout/tool-layout";

const HomePage = lazy(() => import("@/views/home"));
const ClaudePage = lazy(() => import("@/views/claude"));
const GptPage = lazy(() => import("@/views/gpt"));
const IpPage = lazy(() => import("@/views/ip"));
const LinkPage = lazy(() => import("@/views/link"));
const BrowserPage = lazy(() => import("@/views/browser"));
const PingPage = lazy(() => import("@/views/ping"));
const StatusPage = lazy(() => import("@/views/status"));
const DnsLeakPage = lazy(() => import("@/views/dns-exit"));
const WebRtcLeakPage = lazy(() => import("@/views/webrtc/leak-page"));
const SpeedtestPage = lazy(() => import("@/views/network/speedtest"));
const WhoisPage = lazy(() => import("@/views/whois"));
const PolicyPage = lazy(() => import("@/views/policy"));

function Redirect({ to }: { to: string }) {
  const { search, hash } = useLocation();
  const { ip } = useParams();
  const [pathname, query] = to.split("?");
  return (
    <Navigate
      replace
      to={{
        pathname: ip ? `${pathname}/${encodeURIComponent(ip)}` : pathname,
        search: query ? `?${query}` : search,
        hash,
      }}
    />
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="terms" element={<PolicyPage page="terms" />} />
        <Route path="privacy" element={<PolicyPage page="privacy" />} />
        <Route element={<ToolLayout />}>
          <Route path="ip">
            <Route index element={<IpPage />} />
            <Route path=":ip" element={<IpPage />} />
          </Route>
          <Route path="whois" element={<WhoisPage />} />
          <Route path="leak">
            <Route index element={<Navigate replace to="/leak/dns" />} />
            <Route path="dns" element={<DnsLeakPage />} />
            <Route path="webrtc" element={<WebRtcLeakPage />} />
          </Route>
          <Route path="unlock">
            <Route index element={<Navigate replace to="/unlock/sites" />} />
            <Route path="sites" element={<LinkPage />} />
            <Route path="gpt" element={<GptPage />} />
            <Route path="claude" element={<ClaudePage />} />
          </Route>
          <Route path="speedtest" element={<SpeedtestPage />} />
          <Route path="ping" element={<PingPage />} />
          <Route path="status" element={<StatusPage />} />
          <Route path="browser">
            <Route
              index
              element={<Navigate replace to="/browser/environment" />}
            />
            {browserChecks.map((page) => (
              <Route
                key={page}
                path={page}
                element={<BrowserPage key={page} page={page} />}
              />
            ))}
          </Route>
        </Route>
        {Object.entries(legacyRoutes).map(([from, to]) => (
          <Route key={from} path={from} element={<Redirect to={to} />} />
        ))}
        <Route
          path="*"
          element={
            <section className="py-5 text-center text-[0.88rem] leading-[1.8] text-muted-foreground">
              <h1>{t("navigation.pageNotFound")}</h1>
              <Button variant="outline" asChild>
                <Link to="/">{t("navigation.backToOverview")}</Link>
              </Button>
            </section>
          }
        />
      </Route>
    </Routes>
  );
}
