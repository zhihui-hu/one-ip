import { lazy } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import { PageHelpAlert } from "@/components/page-help-alert";
import { Button } from "@/components/ui/button";
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
const StatusPage = lazy(() => import("@/views/status"));
const WhoisPage = lazy(() => import("@/views/whois"));
const ClaudeStatusPage = lazy(() => import("@/views/claude/status"));
const GptStatusPage = lazy(() => import("@/views/gpt/status"));
const CdnPage = lazy(() => import("@/views/cdn"));
const DnsExitPage = lazy(() => import("@/views/dns-exit"));
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
        <Route path="network" element={<ToolLayout group="network" />}>
          <Route index element={<Redirect to="/network/ip" />} />
          <Route path="ip">
            <Route index element={<IpPage />} />
            <Route path=":ip" element={<IpPage />} />
          </Route>
          <Route path="whois" element={<WhoisPage />} />
          <Route path="connectivity" element={<LinkPage />} />
          <Route path="ping" element={<PingPage />} />
          <Route path="cdn" element={<CdnPage />} />
          <Route path="dns" element={<DnsExitPage />} />
        </Route>
        <Route path="browser" element={<ToolLayout group="browser" />}>
          <Route index element={<Redirect to="/browser/environment" />} />
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
        <Route path="ai" element={<ToolLayout group="ai" />}>
          <Route index element={<Redirect to="/ai/gpt" />} />
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
        </Route>
        <Route path="status">
          <Route
            index
            element={
              <>
                <PageHelpAlert />
                <StatusPage />
              </>
            }
          />
          <Route path="openai" element={<GptStatusPage />} />
          <Route path="claude" element={<ClaudeStatusPage />} />
        </Route>
        {Object.entries(legacyRoutes).map(([from, to]) => (
          <Route key={from} path={from} element={<Redirect to={to} />} />
        ))}
        <Route
          path="*"
          element={
            <section className="status-line">
              <h1>404 · 页面不存在</h1>
              <Button variant="outline" asChild>
                <Link to="/">返回概览</Link>
              </Button>
            </section>
          }
        />
      </Route>
    </Routes>
  );
}
