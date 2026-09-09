import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ToolCard, Facts } from "@/components/toolkit";
import { Button } from "@/components/ui/button";
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
              return [name, "不支持查询"] as [string, string];
            }
          },
        ),
      ),
    retry: false,
  });
  async function testMedia(kind: "camera" | "microphone") {
    setBusy(true);
    setMessage("等待授权…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === "camera" ? { video: true } : { audio: true },
      );
      stream.getTracks().forEach((track) => track.stop());
      if (alive.current) setMessage("已获得授权，媒体流已立即关闭。");
    } catch {
      if (alive.current) setMessage("未获得媒体访问权限或设备不可用。");
    } finally {
      if (alive.current) {
        setBusy(false);
        void permissions.refetch();
      }
    }
  }
  function locate() {
    setBusy(true);
    setMessage("等待定位授权…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!alive.current) return;
        setMessage(
          `纬度 ${position.coords.latitude.toFixed(5)}，经度 ${position.coords.longitude.toFixed(5)}，精度约 ${Math.round(position.coords.accuracy)} 米。`,
        );
        setBusy(false);
        void permissions.refetch();
      },
      () => {
        if (alive.current) {
          setMessage("未获得定位结果，可能未授权或位置服务不可用。");
          setBusy(false);
          void permissions.refetch();
        }
      },
      { timeout: 10000, maximumAge: 0 },
    );
  }
  return (
    <>
      <ToolCard title="权限与能力">
        <Facts
          rows={[
            ...(permissions.data ?? []),
            ["安全上下文", isSecureContext ? "是" : "否"],
            ["WebGPU", "gpu" in navigator ? "支持 API" : "不支持"],
            ["IndexedDB", "indexedDB" in window ? "支持 API" : "不支持"],
            [
              "Service Worker",
              "serviceWorker" in navigator ? "支持 API" : "不支持",
            ],
            ["DNT", navigator.doNotTrack ?? "未设置"],
            [
              "GPC",
              String(
                (navigator as BrowserNavigator).globalPrivacyControl ??
                  "未提供",
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
            测试定位
          </Button>
          <Button
            variant="outline"
            disabled={busy || !navigator.mediaDevices?.getUserMedia}
            onClick={() => testMedia("camera")}
          >
            测试摄像头权限
          </Button>
          <Button
            variant="outline"
            disabled={busy || !navigator.mediaDevices?.getUserMedia}
            onClick={() => testMedia("microphone")}
          >
            测试麦克风权限
          </Button>
        </div>
        <p className="small muted mt-2" role="status">
          {message || "点击后才申请权限；媒体测试结束即关闭，不录制内容。"}
        </p>
      </ToolCard>
      <div className="mt-3">
        <WebRtcPage />
      </div>
      <p className="small muted mt-3">
        <Link to="/network/dns">查看 DNS 出口 ›</Link>
      </p>
    </>
  );
}
