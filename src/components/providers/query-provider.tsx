import { useEffect, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "always",
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function QueryProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    const refreshStatus = () => {
      if (document.visibilityState !== "visible") return;
      void queryClient.refetchQueries(
        { queryKey: ["service-status"], type: "active" },
        { cancelRefetch: false },
      );
    };

    document.addEventListener("visibilitychange", refreshStatus);
    return () =>
      document.removeEventListener("visibilitychange", refreshStatus);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
