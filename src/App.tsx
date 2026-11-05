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
import { legacyRoutes } from "@/layout/routes";
import { ToolLayout } from "@/layout/tool-layout";
import { aiPlatforms } from "@/views/ai/platforms";

const PlatformDiagnostics = lazy(() => import("@/views/ai"));
const HomePage = lazy(() => import("@/views/home"));
const ClaudePage = lazy(() => import("@/views/claude"));
const GptPage = lazy(() => import("@/views/gpt"));
const IpPage = lazy(() => import("@/views/ip"));
const LinkPage = lazy(() => import("@/views/link"));
const BrowserPage = lazy(() => import("@/views/browser"));
const ChallengesPage = lazy(() => import("@/views/browser/challenges"));
const PingPage = lazy(() => import("@/views/ping"));
const SpeedtestPage = lazy(() => import("@/views/network/speedtest"));
const StatusPage = lazy(() => import("@/views/status"));
const SubdomainsPage = lazy(() => import("@/views/subdomains"));
const WhoisPage = lazy(() => import("@/views/whois"));
const ClaudeStatusPage = lazy(() => import("@/views/claude/status"));
const GptStatusPage = lazy(() => import("@/views/gpt/status"));
const CdnPage = lazy(() => import("@/views/cdn"));
const DnsExitPage = lazy(() => import("@/views/dns-exit"));
const ApiUsagePage = lazy(() => import("@/views/api-usage"));
const PolicyPage = lazy(() => import("@/views/policy"));
function Redirect({ to }: { to: string }) {
  const { search, hash } = useLocation();
  const { ip } = useParams();
  return (
    <Navigate
      replace
      to={{
        pathname: ip ? `${to}/${encodeURIComponent(ip)}` : to,
        search,
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
        <Route path="docs/api" element={<ApiUsagePage />} />
        <Route path="terms" element={<PolicyPage page="terms" />} />
        <Route path="privacy" element={<PolicyPage page="privacy" />} />
        <Route path="lookup" element={<ToolLayout />}>
          <Route index element={<Navigate replace to="/lookup/ip" />} />
          <Route path="ip">
            <Route index element={<IpPage />} />
            <Route path=":ip" element={<IpPage />} />
          </Route>
          <Route path="whois" element={<WhoisPage />} />
          <Route path="subdomains" element={<SubdomainsPage />} />
        </Route>
        <Route path="network" element={<ToolLayout />}>
          <Route
            index
            element={<Navigate replace to="/network/connectivity" />}
          />
          <Route path="connectivity" element={<LinkPage />} />
          <Route path="dns" element={<DnsExitPage />} />
          <Route path="cdn" element={<CdnPage />} />
          <Route path="speedtest" element={<SpeedtestPage />} />
          <Route path="ping" element={<PingPage />} />
        </Route>
        <Route path="browser" element={<ToolLayout />}>
          <Route
            index
            element={<Navigate replace to="/browser/environment" />}
          />
          {[
            "environment",
            "fingerprint",
            "consistency",
            "automation",
            "privacy",
          ].map((page) => (
            <Route
              key={page}
              path={page}
              element={<BrowserPage key={page} page={page} />}
            />
          ))}
          <Route path="challenges" element={<ChallengesPage />} />
        </Route>
        <Route path="ai" element={<ToolLayout />}>
          <Route index element={<Navigate replace to="/ai/gpt" />} />
          <Route path="gpt" element={<GptPage />} />
          <Route path="claude" element={<ClaudePage />} />
          {aiPlatforms
            .filter((platform) => !["gpt", "claude"].includes(platform.id))
            .map((platform) => (
              <Route
                key={platform.id}
                path={platform.id}
                element={
                  <PlatformDiagnostics key={platform.id} platform={platform} />
                }
              />
            ))}
          <Route path="status">
            <Route index element={<StatusPage />} />
            <Route path="openai" element={<GptStatusPage />} />
            <Route path="claude" element={<ClaudeStatusPage />} />
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
