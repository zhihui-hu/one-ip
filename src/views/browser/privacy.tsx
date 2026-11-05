import { useEffect, useRef, useState } from "react";
import { ToolCard, Facts } from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import WebRtcPage from "@/views/webrtc";
import { useQuery } from "@tanstack/react-query";
import type { BrowserNavigator } from "./environment";

export default function Privacy() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const permissions = useQuery({
    queryKey: ["browser-permissions"],
    queryFn: async () =>
      Promise.all(
        (["geolocation", "camera", "microphone", "notifications"] as const).map(
          async (name) => {
            try {
              return [
                name,
                (
                  await navigator.permissions.query({
                    name: name as PermissionName,
                  })
                ).state,
              ] as [string, string];
            } catch {
              return [name, t("browser.queryUnsupported")] as [string, string];
            }
          },
        ),
      ),
    retry: false,
  });
  async function testMedia(kind: "camera" | "microphone") {
    setBusy(true);
    setMessage(t("browser.awaitingPermission"));
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === "camera" ? { video: true } : { audio: true },
      );
      stream.getTracks().forEach((track) => track.stop());
      if (alive.current)
        setMessage(
          t("browser.permissionGrantedTheMediaStreamWasClosedImmediately"),
        );
    } catch {
      if (alive.current)
        setMessage(t("browser.mediaAccessWasGrantedDeviceUnavailable"));
    } finally {
      if (alive.current) {
        setBusy(false);
        void permissions.refetch();
      }
    }
  }
  function locate() {
    setBusy(true);
    setMessage(t("browser.awaitingLocationPermission"));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!alive.current) return;
        setMessage(
          t("browser.latitudeLongitudeAccuracyApproximatelyMeters", [
            position.coords.latitude.toFixed(5),
            position.coords.longitude.toFixed(5),
            Math.round(position.coords.accuracy),
          ]),
        );
        setBusy(false);
        void permissions.refetch();
      },
      () => {
        if (alive.current) {
          setMessage(
            t("browser.locationResultPermissionMayHaveBeenDeniedLocation"),
          );
          setBusy(false);
          void permissions.refetch();
        }
      },
      { timeout: 10000, maximumAge: 0 },
    );
  }
  return (
    <>
      <ToolCard title={t("browser.permissionsCapabilities")}>
        <Facts
          valueClassName="max-w-[70%]"
          rows={[
            ...(permissions.data ?? []),
            [
              t("browser.secureContext"),
              isSecureContext ? t("common.yes") : t("common.no"),
            ],
            [
              "WebGPU",
              "gpu" in navigator
                ? t("browser.apiSupported")
                : t("common.unsupported"),
            ],
            [
              "IndexedDB",
              "indexedDB" in window
                ? t("browser.apiSupported")
                : t("common.unsupported"),
            ],
            [
              "Service Worker",
              "serviceWorker" in navigator
                ? t("browser.apiSupported")
                : t("common.unsupported"),
            ],
            ["DNT", navigator.doNotTrack ?? t("browser.notSet")],
            [
              "GPC",
              String(
                (navigator as BrowserNavigator).globalPrivacyControl ??
                  t("common.notProvided"),
              ),
            ],
          ]}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy || !navigator.geolocation}
            onClick={locate}
          >
            {t("browser.testLocation")}
          </Button>
          <Button
            variant="outline"
            disabled={busy || !navigator.mediaDevices?.getUserMedia}
            onClick={() => testMedia("camera")}
          >
            {t("browser.testCameraPermission")}
          </Button>
          <Button
            variant="outline"
            disabled={busy || !navigator.mediaDevices?.getUserMedia}
            onClick={() => testMedia("microphone")}
          >
            {t("browser.testMicrophonePermission")}
          </Button>
        </div>
        <p className="mt-2 text-[0.78rem] text-muted-foreground" role="status">
          {message ||
            t(
              "browser.permissionsRequestedAfterClickingMediaStreamsCloseAfter",
            )}
        </p>
      </ToolCard>
      <div className="mt-3">
        <WebRtcPage />
      </div>
    </>
  );
}
