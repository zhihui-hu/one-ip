import { ToolCard } from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import type { Geo } from "@/lib/types";

export function LocationMap({ geo }: { geo: Geo }) {
  const { latitude, longitude } = geo;
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return (
      <ToolCard title={t("地理位置 · 地图")}>
        <p className="small muted">{t("暂无经纬度信息，无法显示地图。")}</p>
      </ToolCard>
    );
  }
  const params = new URLSearchParams({
    bbox: [
      Math.max(-180, longitude - 0.3),
      Math.max(-90, latitude - 0.2),
      Math.min(180, longitude + 0.3),
      Math.min(90, latitude + 0.2),
    ].join(","),
    layer: "mapnik",
    marker: `${latitude},${longitude}`,
  });
  return (
    <ToolCard title={t("地理位置 · 地图")}>
      <div className="row-between mb-3 gap-3">
        <p className="small muted">
          {[geo.country, geo.region, geo.city].filter(Boolean).join(" · ") ||
            t("IP 归属位置")}
        </p>
        <Button variant="outline" size="sm" asChild>
          <a
            href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=10/${latitude}/${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("查看大图")}
          </a>
        </Button>
      </div>
      <iframe
        key={`${latitude},${longitude}`}
        title={t("{0} 的大致地理位置", [geo.ip])}
        src={`https://www.openstreetmap.org/export/embed.html?${params}`}
        loading="lazy"
        className="h-72 w-full rounded-lg border-0 sm:h-96"
      />
      <p className="small muted mt-2">
        {t("地图显示 IP 的大致归属位置，不代表设备的精确位置。")}
      </p>
    </ToolCard>
  );
}
