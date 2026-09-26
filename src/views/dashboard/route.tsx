import { Navigate } from "react-router-dom";
import { AppUpdateChecker } from "@/components/providers/app-update-checker";
import { Button } from "@/components/ui/button";
import { SweepShine } from "@/components/ui/sweep-shine";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSession } from "@/views/login/api";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "sonner";
import "./commercial.css";
import Dashboard from "./index";

export function CommercialLayout() {
  const session = useQuery({
    queryKey: ["session"],
    queryFn: getSession,
    staleTime: 30_000,
    retry: false,
  });
  if (session.isPending)
    return (
      <main className="grid min-h-svh place-items-center" role="status">
        <SweepShine>正在读取登录状态…</SweepShine>
      </main>
    );
  if (session.isError)
    return (
      <main className="grid min-h-svh place-content-center gap-3 p-4">
        <p role="alert">{session.error.message}</p>
        <Button
          disabled={session.isFetching}
          onClick={() => void session.refetch()}
        >
          重试
        </Button>
        <Button asChild variant="outline">
          <a href="/login">重新登录</a>
        </Button>
      </main>
    );
  if (!session.data) return <Navigate replace to="/login" />;
  return (
    <TooltipProvider>
      <Dashboard user={session.data} />
      <Toaster />
      <aside className="fixed right-2 bottom-2 z-50 max-w-sm">
        <AppUpdateChecker />
      </aside>
    </TooltipProvider>
  );
}
