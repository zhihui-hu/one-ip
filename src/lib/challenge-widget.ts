import { t } from "@/i18n";

export type WidgetApi = {
  render(
    container: HTMLElement,
    options: Record<string, unknown>,
  ): string | number;
  reset(id: string | number): void;
  remove?(id: string | number): void;
};
declare global {
  interface Window {
    turnstile?: WidgetApi;
  }
}
const scripts = new Map<string, Promise<WidgetApi>>();
export function loadWidget(): Promise<WidgetApi> {
  const key = "turnstile";
  const existing = scripts.get(key);
  if (existing) return existing;
  const promise = new Promise<WidgetApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    const timer = setTimeout(() => fail(), 15000);
    function fail() {
      clearTimeout(timer);
      script.remove();
      scripts.delete(key);
      reject(
        new Error(
          t(
            "challenges.verificationComponentFailedLoadCheckNetworkContentBlocking",
          ),
        ),
      );
    }
    script.onerror = fail;
    script.onload = () => {
      const api = window.turnstile;
      if (!api?.render) {
        fail();
        return;
      }
      clearTimeout(timer);
      resolve(api);
    };
    document.head.append(script);
  });
  scripts.set(key, promise);
  return promise;
}
