import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

type WidgetApi = {
  render(
    container: HTMLElement,
    options: Record<string, unknown>,
  ): string | number;
  reset(id: string | number): void;
  remove(id: string | number): void;
};
export type TurnstileWidgetHandle = { reset(): void };
type Props = {
  sitekey: string;
  onTokenChange(token: string): void;
  onError(): void;
};

let scriptPromise: Promise<WidgetApi> | null = null;
function api() {
  return (window as Window & { turnstile?: WidgetApi }).turnstile;
}
function loadScript(): Promise<WidgetApi> {
  const existing = api();
  if (existing) return Promise.resolve(existing);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onerror = () => {
      scriptPromise = null;
      script.remove();
      reject(new Error("Turnstile unavailable"));
    };
    script.onload = () => {
      const ready = (attempt: number) => {
        const loaded = api();
        if (loaded) resolve(loaded);
        else if (attempt < 100) window.setTimeout(() => ready(attempt + 1), 20);
        else {
          scriptPromise = null;
          reject(new Error("Turnstile unavailable"));
        }
      };
      ready(0);
    };
    document.head.append(script);
  });
  return scriptPromise;
}

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, Props>(
  function TurnstileWidget({ sitekey, onTokenChange, onError }, ref) {
    const container = useRef<HTMLDivElement>(null);
    const widgetId = useRef<string | number | null>(null);
    const callbacks = useRef({ onTokenChange, onError });
    const [ready, setReady] = useState(false);
    callbacks.current = { onTokenChange, onError };

    useImperativeHandle(ref, () => ({
      reset() {
        if (widgetId.current !== null) {
          try {
            api()?.reset(widgetId.current);
          } catch {
            callbacks.current.onError();
          }
        }
        callbacks.current.onTokenChange("");
      },
    }));

    useEffect(() => {
      let active = true;
      let rendered: WidgetApi | undefined;
      void loadScript()
        .then((turnstile) => {
          if (!active || !container.current) return;
          rendered = turnstile;
          widgetId.current = turnstile.render(container.current, {
            sitekey,
            action: "login",
            appearance: "always",
            size: "flexible",
            theme: "auto",
            callback: (token: string) => {
              if (active) callbacks.current.onTokenChange(token);
            },
            "expired-callback": () => {
              if (active && widgetId.current !== null) {
                callbacks.current.onTokenChange("");
                turnstile.reset(widgetId.current);
              }
            },
            "timeout-callback": () => {
              if (active && widgetId.current !== null) {
                callbacks.current.onTokenChange("");
                turnstile.reset(widgetId.current);
              }
            },
            "error-callback": () => {
              if (active) {
                callbacks.current.onTokenChange("");
                callbacks.current.onError();
              }
              return true;
            },
          });
          setReady(true);
        })
        .catch(() => {
          if (active) callbacks.current.onError();
        });
      return () => {
        active = false;
        if (rendered && widgetId.current !== null) {
          try {
            rendered.remove(widgetId.current);
          } catch {
            // An expired widget may already have detached itself.
          }
        }
        widgetId.current = null;
      };
    }, [sitekey]);

    return (
      <div className="min-h-[65px] w-full">
        {!ready && (
          <span className="sr-only" role="status">
            正在加载人机验证…
          </span>
        )}
        <div ref={container} className="w-full" />
      </div>
    );
  },
);
