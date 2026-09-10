import { useEffect } from "react";
import { UpdateAvailableNotice } from "@/components/update-available-notice";
import { t } from "@/i18n";
import { updateAvailableAtom } from "@/store/app-update";
import { useAtom } from "jotai";

type WorkerMessage = {
  type: "baseline" | "unchanged" | "changed" | "unavailable" | "error";
  message?: string;
};

export function AppUpdateChecker() {
  const [available, setAvailable] = useAtom(updateAvailableAtom);

  useEffect(() => {
    if (
      !import.meta.env.PROD ||
      typeof Worker === "undefined" ||
      !["http:", "https:"].includes(window.location.protocol)
    )
      return;

    // Compare the running build with the deployed manifest, independent of HTTP validators.
    const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
    const workerUrl = new URL("app-update-checker.worker.js", baseUrl);
    workerUrl.searchParams.set("build", import.meta.env.VITE_BUILD_TIME);
    let worker: Worker;
    try {
      worker = new Worker(workerUrl, { name: "app-update-checker" });
    } catch (error) {
      console.debug("App update checker could not start.", error);
      return;
    }

    const requestCheck = (source: string) => {
      if (document.visibilityState === "hidden") return;
      worker.postMessage({
        type: "check",
        source,
        url: new URL("app-version.json", baseUrl).href,
        build: import.meta.env.VITE_BUILD_TIME,
      });
    };
    const onMessage = ({ data }: MessageEvent<WorkerMessage>) => {
      if (data?.type === "changed") setAvailable(true);
      if (data?.type === "error")
        console.debug("App update check failed.", data.message);
    };
    const onError = (event: ErrorEvent) =>
      console.debug("App update worker failed.", event.message);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible")
        requestCheck("visibilitychange");
    };

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    document.addEventListener("visibilitychange", onVisibilityChange);
    requestCheck("mount");
    const interval = window.setInterval(() => requestCheck("interval"), 60_000);
    return () => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(interval);
      worker.terminate();
    };
  }, [setAvailable]);

  return (
    <UpdateAvailableNotice
      open={available}
      onOpenChange={setAvailable}
      onUpdate={() => {
        const url = new URL(window.location.href);
        url.searchParams.set("t", Date.now().toString());
        window.location.replace(url.toString());
      }}
      title={t("新版本，等你来体验")}
      description={t(
        "忙完手头的事，再来看看新版吧。更新前记得保存未提交的内容。",
      )}
      updateLabel={t("体验新版")}
      updatingLabel={t("正在为你切换…")}
    />
  );
}
