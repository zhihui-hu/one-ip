import { useState } from "react";
import { Link } from "react-router-dom";
import { Pending } from "@/components/toolkit";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { t } from "@/i18n";
import { ApiCodeBlock } from "@/views/api-code-block";
import { useQuery } from "@tanstack/react-query";
import { Terminal } from "lucide-react";
import { getBrowserIp } from "./api";

type Format = "text" | "json";

/** Bottom-of-page pointer to the IP health API, with its live TXT / JSON response. */
export function ApiResponse() {
  const [format, setFormat] = useState<Format | null>(null);
  // Local development has no caller address: ask about the page's own egress.
  const ip = useQuery({
    queryKey: ["browser-ip", 4],
    queryFn: ({ signal }) => getBrowserIp(4, signal),
    retry: false,
    staleTime: 60_000,
    enabled: import.meta.env.DEV,
  }).data?.ip;
  const query = new URLSearchParams();
  if (import.meta.env.DEV && ip) query.set("ip", ip);
  if (format === "text") query.set("format", "text");
  const search = query.size ? `?${query}` : "";
  const endpoint = `${window.location.origin}/api/ip/health${search}`;
  const response = useQuery({
    queryKey: ["api-ip-health", format, ip],
    enabled: format !== null,
    retry: false,
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/ip/health${search}`, {
        signal,
        cache: "no-store",
      });
      const body = await res.text();
      // Errors are always JSON, whatever format was asked for.
      if (format === "text" && res.ok)
        return {
          status: res.status,
          ok: true,
          text: body.trimEnd(),
          json: false,
        };
      try {
        return {
          status: res.status,
          ok: res.ok,
          text: JSON.stringify(JSON.parse(body), null, 2),
          json: true,
        };
      } catch {
        return { status: res.status, ok: res.ok, text: body, json: false };
      }
    },
  });
  return (
    <>
      <Alert>
        <Terminal aria-hidden="true" />
        <AlertTitle>{t("home.api.title")}</AlertTitle>
        <AlertDescription>
          <p>
            {t("home.api.description")}{" "}
            <Link className="text-primary" to="/docs/api">
              {t("home.api.docs")}
            </Link>
          </p>
          <div className="mt-2 flex gap-2">
            {(["text", "json"] as const).map((item) => (
              <Button
                key={item}
                size="sm"
                variant="outline"
                onClick={() => setFormat(item)}
              >
                {item === "text" ? "TXT" : "JSON"}
              </Button>
            ))}
          </div>
        </AlertDescription>
      </Alert>
      <ResponsiveDialog
        open={format !== null}
        onOpenChange={(open) => !open && setFormat(null)}
        title={t("home.api.responseTitle", [
          format === "text" ? "TXT" : "JSON",
        ])}
        description={t("home.api.responseDescription")}
        dialogClassName="sm:max-w-2xl"
      >
        <ApiCodeBlock code={`curl -fsS '${endpoint}'`} language="bash" />
        {response.isPending ? (
          <Pending>{t("common.loading")}</Pending>
        ) : response.isError ? (
          <p className="text-sm text-destructive">
            {t("home.api.failed", [String(response.error.message)])}
          </p>
        ) : (
          <>
            {!response.data.ok && (
              <p className="text-sm text-destructive">
                {t("home.api.status", [response.data.status])}
              </p>
            )}
            <ApiCodeBlock
              code={response.data.text}
              language={response.data.json ? "json" : "text"}
            />
          </>
        )}
      </ResponsiveDialog>
    </>
  );
}
