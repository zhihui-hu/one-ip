import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";

/** Cancel browser probes, ICE connections, and polling on route unmount. */
export function useDiagnostic<T, V = void>(
  run: (variables: V, signal: AbortSignal) => Promise<T>,
) {
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  return useMutation({
    mutationFn: async (variables: V) => {
      controller.current?.abort();
      controller.current = new AbortController();
      return run(variables, controller.current.signal);
    },
    retry: false,
  });
}
