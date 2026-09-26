import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { ModelContext } from "@/webmcp";

export function WebMcp() {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context?.registerTool) return;
    let mounted = true;
    const controller = new AbortController();
    void import("@/webmcp")
      .then(({ createWebMcpTools }) => {
        if (!mounted) return;
        for (const tool of createWebMcpTools((path) =>
          navigateRef.current(path),
        )) {
          void context
            .registerTool(tool, { signal: controller.signal })
            .catch((error: unknown) => {
              if (!controller.signal.aborted)
                console.warn(`WebMCP: ${tool.name} registration failed`, error);
            });
        }
      })
      .catch((error: unknown) => {
        if (mounted) console.warn("WebMCP: tool loading failed", error);
      });
    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);
  return null;
}
