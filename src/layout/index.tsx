import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { BuildInfo } from "@/components/build-info";
import { AppUpdateChecker } from "@/components/providers/app-update-checker";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UnderlineHover } from "@/components/underline-hover";
import { useTheme } from "@/hooks/use-theme";
import { Moon, Sun, Monitor, ChevronDown } from "lucide-react";
import { Toaster } from "sonner";

const routes = [
  ["/", "IP查询", "查询"],
  ["/claude/", "Claude AI IP 检测", "Claude"],
  ["/ip/", "IP评分", "评分"],
  ["/gpt/", "GPT 检测", "GPT"],
  ["/link/", "网络连通", "连通"],
  ["/dns/", "DNS泄露", "DNS"],
  ["/webrtc/", "WebRTC", "UDP"],
  ["/ping/", "全球Ping", "Ping"],
  ["/status/", "服务状态", "状态"],
];
const more = [
  ["/whois/", "Whois查询"],
  ["/news/", "AI资讯"],
  ["/card/", "IP卡片"],
];
export function AppLayout() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  const ThemeIcon =
    theme === "system" ? Monitor : theme === "dark" ? Moon : Sun;
  return (
    <>
      <div className="coffee-container">
        <nav className="coffee-nav" aria-label="主导航">
          <div className="nav-scroll">
            {routes.map(([path, label, short]) => (
              <UnderlineHover asChild key={path}>
                <NavLink to={path} end={path === "/"}>
                  <span className="nav-full">{label}</span>
                  <span className="nav-short">{short}</span>
                </NavLink>
              </UnderlineHover>
            ))}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="nav-more">
                更多
                <ChevronDown data-icon="inline-end" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                {more.map(([path, label]) => (
                  <DropdownMenuItem asChild key={path}>
                    <Link to={path}>{label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                className="theme-button"
                aria-label="切换主题模式"
              >
                <ThemeIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                {(
                  [
                    ["light", "亮色模式", Sun],
                    ["dark", "暗黑模式", Moon],
                    ["system", "跟随系统", Monitor],
                  ] as const
                ).map(([mode, label, Icon]) => (
                  <DropdownMenuItem key={mode} onSelect={() => setTheme(mode)}>
                    <Icon />
                    {label}
                    {theme === mode && " ✓"}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
        <main>
          <Outlet />
        </main>
        <footer className="coffee-footer">
          © {new Date().getFullYear()} Net.Coffee 复刻版 ·{" "}
          <UnderlineHover asChild>
            <Link to="/">IP查询</Link>
          </UnderlineHover>{" "}
          ·{" "}
          <UnderlineHover asChild>
            <Link to="/claude/">Claude AI 检测</Link>
          </UnderlineHover>{" "}
          ·{" "}
          <UnderlineHover asChild>
            <Link to="/ip/">IP评分</Link>
          </UnderlineHover>
          <div className="build-meta">
            <BuildInfo />
          </div>
        </footer>
      </div>
      <aside aria-label="站点通知" className="update-notices">
        <AppUpdateChecker />
      </aside>
      <Toaster theme={resolvedTheme} position="top-right" />
    </>
  );
}
