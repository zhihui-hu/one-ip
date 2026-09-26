import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTurnstileConfig, login } from "./api";
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "./turnstile-widget";
import pkg from "../../../package.json";

export default function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileError, setTurnstileError] = useState(false);
  const turnstile = useRef<TurnstileWidgetHandle>(null);
  const turnstileConfig = useQuery({
    queryKey: ["login-turnstile"],
    queryFn: getTurnstileConfig,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: () => login(username, password, turnstileToken),
    onSuccess: ({ user }) => {
      queryClient.setQueryData(["session"], user);
      navigate("/dashboard/admin", { replace: true });
    },
    onError: () => {
      setTurnstileToken("");
      turnstile.current?.reset();
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!mutation.isPending && turnstileToken) mutation.mutate();
  };
  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-muted px-4 py-10">
      <section
        aria-labelledby="login-title"
        className="w-full max-w-md rounded-2xl bg-card p-6 text-left text-card-foreground sm:p-7"
      >
        <div className="flex items-center gap-3">
          <img
            src="/icon.svg"
            width="48"
            height="48"
            className="size-12 shrink-0"
            alt=""
          />
          <div>
            <h1
              id="login-title"
              className="text-xl font-semibold tracking-tight"
            >
              One IP
            </h1>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              v{pkg.version}
            </p>
          </div>
        </div>
        <div className="mt-9 mb-6 space-y-2">
          <p className="text-base font-medium">看清网络，管理你的诊断工作。</p>
          <p className="text-sm leading-6 text-muted-foreground">
            使用 One IP 账号登录。
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              autoComplete="username"
              required
              minLength={3}
              maxLength={64}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={mutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={mutation.isPending}
            />
          </div>
          {turnstileConfig.isSuccess && (
            <TurnstileWidget
              ref={turnstile}
              sitekey={turnstileConfig.data.sitekey}
              onTokenChange={(token) => {
                setTurnstileToken(token);
                if (token) setTurnstileError(false);
              }}
              onError={() => setTurnstileError(true)}
            />
          )}
          {turnstileConfig.isPending && (
            <p role="status" className="text-sm text-muted-foreground">
              正在加载人机验证…
            </p>
          )}
          {turnstileConfig.isError && (
            <p role="alert" className="text-sm text-destructive">
              {turnstileConfig.error.message}
            </p>
          )}
          {turnstileError && (
            <p role="alert" className="text-sm text-destructive">
              人机验证未完成，请刷新页面重试。
            </p>
          )}
          {mutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error.message}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            className="h-11 w-full rounded-md"
            disabled={mutation.isPending || !turnstileToken}
          >
            {mutation.isPending ? "登录中…" : "登录"}
          </Button>
        </form>
      </section>
    </main>
  );
}
