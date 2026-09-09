import { request, parseTrace } from "../../lib/network.ts";

export interface AiProbeResult {
  samples: number[];
  median: number | null;
  status: "response" | "restricted" | "unknown";
  description: string;
}
export async function probeAiDomain(
  domain: string,
  signal?: AbortSignal,
): Promise<AiProbeResult> {
  const readable = domain === "claude.ai" || domain === "www.perplexity.ai";
  const path = readable
    ? "/cdn-cgi/trace"
    : domain === "gemini.google.com"
      ? "/robots.txt"
      : "/favicon.ico";
  const samples: number[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    signal?.throwIfAborted();
    const start = performance.now();
    try {
      const body = await request<string>(
        `https://${domain}${path}`,
        {
          mode: readable ? "cors" : "no-cors",
          credentials: "omit",
          cache: "no-store",
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(6000)])
            : AbortSignal.timeout(6000),
        },
        readable ? "text" : "opaque",
      );
      if (readable) parseTrace(body);
      const elapsed = Math.round(performance.now() - start);
      samples.push(elapsed);
      return {
        samples,
        median: elapsed,
        status: "response",
        description: readable
          ? `已读取并校验 ${domain} 的边缘网络响应；不代表登录、对话或验证码一定可用。`
          : `收到 ${domain}${path} 的资源响应；不代表登录或对话可用，也无法读取跨域 HTTP 状态码。`,
      };
    } catch (error) {
      if (signal?.aborted) throw error;
      samples.push(-1);
    }
  }
  return {
    samples,
    median: null,
    status: "unknown",
    description:
      "两次探测均未取得响应，可能超时、被内容拦截或受站点防护限制；不能据此断言网站打不开。",
  };
}
