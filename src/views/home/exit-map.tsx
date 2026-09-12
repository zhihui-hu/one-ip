import { useEffect, useRef, useState } from "react";
import { SiteLogo } from "@/components/site-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import type { Geo } from "@/lib/types";
import { gsap } from "gsap";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { categoryStatusClass } from "./category-status";

export default function ExitMap({
  rows,
  onSelect,
  mapOnly = false,
}: {
  rows: {
    id: string;
    name: string;
    icon: string;
    extra?: string[];
    domain?: string;
    url?: string;
    geo?: Geo;
    visible: boolean;
    pending: boolean;
    geoPending: boolean;
  }[];
  onSelect: (id: string) => void;
  mapOnly?: boolean;
}) {
  const [category, setCategory] = useState("all");
  const shownRows = rows.filter(
    (row) => category === "all" || row.extra?.includes(category),
  );
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const fitted = useRef(false);
  const scope = rows
    .filter((row) => row.visible)
    .map((row) => row.id)
    .sort()
    .join("|");
  const finished =
    rows.some((row) => row.visible) &&
    rows.every((row) => !row.visible || (!row.pending && !row.geoPending));
  const bounds = useRef<L.LatLngBounds | null>(null);
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, {
      scrollWheelZoom: false,
      minZoom: 1,
    }).setView([25, 20], 2);
    map.current = instance;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    })
      .on("tileerror", () => setTileError(true))
      .addTo(instance);
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      fitted.current = false;
      markers.current.clear();
      instance.remove();
      map.current = null;
    };
  }, []);
  const groups = new Map<
    string,
    { position: L.LatLngTuple; sites: typeof rows }
  >();
  for (const row of rows) {
    const lat = row.geo?.latitude;
    const lon = row.geo?.longitude;
    if (
      typeof lat !== "number" ||
      typeof lon !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      Math.abs(lat) > 90 ||
      Math.abs(lon) > 180
    )
      continue;
    const key = `${lat},${lon}`;
    const group = groups.get(key) ?? { position: [lat, lon], sites: [] };
    group.sites.push(row);
    groups.set(key, group);
  }
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const active = new Set<string>();
    const positions: L.LatLngTuple[] = [];
    for (const group of groups.values()) {
      positions.push(group.position);
      const key = group.position.join(",");
      active.add(key);
      const location = [group.sites[0].geo?.city, group.sites[0].geo?.country]
        .filter(Boolean)
        .join(" · ");
      const content = document.createElement("div");
      content.style.cssText = "max-height:220px;overflow:auto;min-width:180px";
      const heading = document.createElement("strong");
      heading.textContent = location;
      content.append(heading);
      for (const site of group.sites) {
        const button = document.createElement("button");
        button.type = "button";
        button.style.cssText =
          "display:block;text-align:left;padding:6px 0;width:100%";
        button.textContent = `${site.domain ?? site.name} · ${site.geo?.ip} · ${t("已读取出口")}`;
        button.onclick = () => onSelect(site.id);
        content.append(button);
      }
      const label = document.createElement("div");
      label.className = "exit-map-label";
      const title = document.createElement("strong");
      title.textContent =
        location ||
        `${group.position[0].toFixed(2)}, ${group.position[1].toFixed(2)}`;
      const detail = document.createElement("span");
      detail.textContent = `${group.sites.length} ${t("个站点")} · ${group.sites[0].domain ?? group.sites[0].name}${group.sites.length > 1 ? " …" : ""}`;
      label.append(title, detail);
      let marker = markers.current.get(key);
      if (!marker) {
        const dot = document.createElement("span");
        dot.className = "exit-map-dot";
        dot.textContent = String(group.sites.length);
        marker = L.marker(group.position, {
          icon: L.divIcon({
            className: "",
            html: dot,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          }),
        }).addTo(instance);
        markers.current.set(key, marker);
        marker.bindTooltip(label, {
          permanent: false,
          direction: "top",
          offset: [0, -8],
          className: "exit-map-tooltip",
        });
        const element = marker.getElement()?.firstElementChild;
        if (
          element &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          gsap.fromTo(element, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        }
      } else {
        marker.setTooltipContent(label);
        const dot = marker.getElement()?.firstElementChild;
        if (dot) dot.textContent = String(group.sites.length);
      }
      marker
        .getElement()
        ?.setAttribute(
          "aria-label",
          `${location} · ${group.sites.length} ${t("个站点")}`,
        );
      if (marker.getPopup()) marker.setPopupContent(content);
      else marker.bindPopup(content);
    }
    for (const [key, marker] of markers.current) {
      if (!active.has(key)) {
        marker.remove();
        markers.current.delete(key);
      }
    }
    bounds.current = positions.length ? L.latLngBounds(positions) : null;
  });
  useEffect(() => {
    fitted.current = false;
  }, [scope]);
  useEffect(() => {
    if (!finished) {
      fitted.current = false;
      return;
    }
    if (fitted.current || !bounds.current || !map.current) return;
    fitted.current = true;
    map.current.fitBounds(bounds.current, {
      padding: [32, 32],
      maxZoom: 5,
      animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      duration: 0.5,
    });
  }, [finished, scope]);
  return (
    <section className="mb-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {t("出口地图")} · {groups.size} {t("个位置")}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (bounds.current)
              map.current?.fitBounds(bounds.current, {
                padding: [40, 40],
                maxZoom: 5,
              });
            else map.current?.setView([25, 20], 2);
          }}
        >
          {t("查看全部出口")}
        </Button>
      </div>
      <div
        className={`grid overflow-hidden rounded-lg border ${mapOnly ? "" : "lg:grid-cols-[minmax(0,1fr)_280px]"}`}
      >
        <div
          ref={container}
          className="exit-map relative z-0 h-[280px] min-w-0 sm:h-[360px]"
          aria-label={t("出口地图")}
        />
        {!mapOnly && (
          <div className="flex min-h-0 flex-col border-t bg-background lg:border-t-0 lg:border-l">
            <div
              className="flex items-center justify-between border-b px-3 py-2 text-xs font-medium"
              role="status"
            >
              <div
                className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="group"
                aria-label={t("站点分类")}
              >
                {[
                  ["all", "全部"],
                  ["ai", "AI 服务"],
                  ["crypto", "加密货币"],
                  ["ecommerce", "跨境电商"],
                  ["media", "流媒体"],
                  ["social", "社交社区"],
                  ["dev", "开发平台"],
                  ["tools", "实用工具"],
                  ["static", "静态资源"],
                  ["speed", "测速服务"],
                ].map(([value, label]) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={category === value ? "secondary" : "ghost"}
                    aria-pressed={category === value}
                    className={`h-9 shrink-0 px-3 text-sm font-medium ${categoryStatusClass(rows.filter((row) => value === "all" || row.extra?.includes(value)))}`}
                    onClick={() => setCategory(value)}
                  >
                    {t(label)} (
                    {
                      rows.filter(
                        (row) =>
                          (value === "all" || row.extra?.includes(value)) &&
                          row.visible &&
                          !row.pending &&
                          Boolean(row.geo?.ip),
                      ).length
                    }
                    /
                    {
                      rows.filter(
                        (row) => value === "all" || row.extra?.includes(value),
                      ).length
                    }
                    )
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex max-h-60 flex-wrap content-start gap-1.5 overflow-y-auto p-2.5 lg:max-h-[326px]">
              {shownRows.map((row) => {
                const status = !row.visible
                  ? t("等待检测")
                  : row.pending
                    ? t("检测中…")
                    : !row.geo
                      ? t("检测受阻")
                      : row.geoPending
                        ? t("查询中…")
                        : t("已读取出口");
                const color = !row.visible
                  ? "bg-muted text-muted-foreground"
                  : row.pending || row.geoPending
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : row.geo
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "bg-destructive/10 text-destructive";
                const hostname =
                  row.domain ?? row.icon.match(/\/ip3\/([^/?#]+)\.ico/)?.[1];
                const website = row.domain
                  ? `https://${row.domain}`
                  : (row.url ?? `https://${hostname ?? row.name}`);
                return (
                  <Badge
                    key={row.id}
                    asChild
                    variant="outline"
                    className={`h-8 max-w-full gap-1.5 border-transparent px-2.5 transition-colors hover:brightness-95 motion-reduce:transition-none [&_.site-icon]:size-4 ${color}`}
                  >
                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${website} · ${status}`}
                      aria-label={`${website} · ${status}`}
                    >
                      <SiteLogo src={row.icon} />
                      <span className="truncate">
                        {(hostname ?? new URL(website).hostname).replace(
                          /^www\./,
                          "",
                        )}
                      </span>
                    </a>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {tileError && (
        <p className="text-xs text-muted-foreground">
          {t("地图底图加载失败，请检查网络后刷新；出口列表仍可使用。")}
        </p>
      )}
    </section>
  );
}
