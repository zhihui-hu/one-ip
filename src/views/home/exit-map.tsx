import { useEffect, useRef, useState } from "react";
import { SiteLogo } from "@/components/site-logo";
import { Pending } from "@/components/toolkit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { attachMapLayers, loadMapConfig } from "@/lib/map";
import { maskedIp } from "@/lib/network";
import type { Geo } from "@/lib/types";
import { hideIpAtom } from "@/store/privacy";
import { gsap } from "gsap";
import { useAtomValue } from "jotai";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { categoryStatusClass } from "./category-status";
import "./home.css";
import { siteCategories } from "./site-categories";

const exitMapDotClass =
  "relative isolate z-0 grid size-[26px] place-items-center overflow-visible rounded-[50%] border-2 border-white bg-[#2563eb] text-white shadow-[0_0_0_4px_#2563eb22,0_2px_5px_#0002] [font:600_11px/1_sans-serif] before:pointer-events-none before:absolute before:-inset-[7px] before:-z-1 before:animate-[map-marker-ping_2.4s_cubic-bezier(0,0,0.2,1)_infinite] before:rounded-[50%] before:border-2 before:border-[#2563eb66] before:content-[''] motion-reduce:before:animate-none motion-reduce:before:opacity-35 motion-reduce:before:[transform:scale(1)]";

export default function ExitMap({
  rows,
  onSelect,
  mapOnly = false,
}: {
  rows: {
    name: string;
    icon: string;
    extra?: string[];
    domain?: string;
    url?: string;
    geo?: Geo;
    visible: boolean;
    pending: boolean;
    reachable?: boolean;
    geoPending: boolean;
  }[];
  onSelect: (name: string) => void;
  mapOnly?: boolean;
}) {
  const hidden = useAtomValue(hideIpAtom);
  const [category, setCategory] = useState("all");
  const shownRows = rows.filter(
    (row) => category === "all" || row.extra?.includes(category),
  );
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const fitted = useRef(false);
  const scope = shownRows
    .map((row) => row.name)
    .sort()
    .join("|");
  const finished =
    shownRows.length > 0 &&
    shownRows.every((row) => row.visible && !row.pending && !row.geoPending);
  const bounds = useRef<L.LatLngBounds | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const activeMarkers = markers.current;
    let disposed = false;
    let detachLayers = () => {};
    const instance = L.map(element, {
      scrollWheelZoom: false,
      minZoom: 1,
    }).setView([25, 20], 2);
    map.current = instance;
    instance.attributionControl.setPrefix(false);
    setLoaded(false);
    setTileError(false);
    void loadMapConfig().then((config) => {
      if (disposed) return;
      detachLayers = attachMapLayers(
        L.tileLayer,
        instance,
        config,
        () => {
          setLoaded(true);
          setTileError(false);
        },
        () => setTileError(true),
      );
    });
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(element);
    return () => {
      disposed = true;
      detachLayers();
      observer.disconnect();
      fitted.current = false;
      activeMarkers.clear();
      instance.remove();
      map.current = null;
    };
  }, [attempt]);
  const groups = new Map<
    string,
    { position: L.LatLngTuple; sites: typeof rows }
  >();
  for (const row of shownRows) {
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
        const ip = site.geo?.ip;
        button.textContent = `${site.domain ?? site.name} · ${ip ? maskedIp(ip, hidden) : t("common.unknown")} · ${t("home.egressCollected")}`;
        button.onclick = () => onSelect(site.name);
        content.append(button);
      }
      const label = document.createElement("div");
      label.className =
        "grid w-max max-w-[220px] min-w-[120px] gap-px [font:11px/1.4_var(--font-sans,sans-serif)]";
      const title = document.createElement("strong");
      title.className = "overflow-hidden text-ellipsis whitespace-nowrap";
      title.textContent =
        location ||
        `${group.position[0].toFixed(2)}, ${group.position[1].toFixed(2)}`;
      const detail = document.createElement("span");
      detail.className =
        "overflow-hidden text-[10px] text-ellipsis whitespace-nowrap text-muted-foreground";
      detail.textContent = `${group.sites.length} ${t("home.sites")} · ${group.sites[0].domain ?? group.sites[0].name}${group.sites.length > 1 ? " …" : ""}`;
      label.append(title, detail);
      let marker = markers.current.get(key);
      if (!marker) {
        const dot = document.createElement("span");
        dot.className = exitMapDotClass;
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
          `${location} · ${group.sites.length} ${t("home.sites")}`,
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
  }, [finished, scope, attempt]);
  return (
    <section className="mb-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {t("home.egressMap")} · {groups.size} {t("home.locations")}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (bounds.current)
              map.current?.fitBounds(bounds.current, {
                padding: [40, 40],
                maxZoom: 5,
                animate: !window.matchMedia("(prefers-reduced-motion: reduce)")
                  .matches,
              });
            else map.current?.setView([25, 20], 2, { animate: false });
          }}
        >
          {t("home.showAllExits")}
        </Button>
      </div>
      <div
        className={`grid overflow-hidden rounded-lg border ${mapOnly ? "" : "lg:grid-cols-[minmax(0,1fr)_280px]"}`}
      >
        <div className="relative min-w-0">
          <div
            ref={container}
            className="exit-map relative z-0 h-[280px] min-w-0 sm:h-[360px]"
            aria-label={t("home.egressMap")}
            aria-busy={!loaded && !tileError}
          />
          {!loaded && !tileError && (
            <div
              className="pointer-events-none absolute inset-0 grid place-items-center"
              role="status"
            >
              <span className="rounded-md bg-background/90 px-3 py-2 text-xs shadow-sm">
                <Pending>{t("home.loadingMap")}</Pending>
              </span>
            </div>
          )}
        </div>
        {!mapOnly && (
          <div className="flex min-h-0 flex-col border-t bg-background lg:border-t-0 lg:border-l">
            <div
              className="flex items-center justify-between border-b px-3 py-2 text-xs font-medium"
              role="status"
            >
              <div
                className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="group"
                aria-label={t("home.siteCategory")}
              >
                {siteCategories
                  .filter(([value]) => value !== "domestic")
                  .map(([value, label]) => (
                    <Button
                      key={value}
                      size="sm"
                      variant={category === value ? "secondary" : "ghost"}
                      aria-pressed={category === value}
                      className={`h-9 shrink-0 px-3 text-sm font-medium ${categoryStatusClass(rows.filter((row) => value === "all" || row.extra?.includes(value)))}`}
                      onClick={() => setCategory(value)}
                    >
                      {label} (
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
                          (row) =>
                            value === "all" || row.extra?.includes(value),
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
                  ? t("home.waitingToCheck")
                  : row.pending
                    ? t("common.checking")
                    : row.reachable === false
                      ? t("home.websiteAccessBlocked")
                      : !row.geo
                        ? t("home.egressUnavailable")
                        : row.geoPending
                          ? t("common.lookingUpEllipsis")
                          : t("home.egressCollected");
                const color = !row.visible
                  ? "bg-muted text-muted-foreground"
                  : row.pending || row.geoPending
                    ? "bg-warning/10 text-warning"
                    : row.reachable === false
                      ? "bg-destructive/10 text-destructive"
                      : row.geo
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning";
                const hostname =
                  row.domain ?? row.icon.match(/\/ip3\/([^/?#]+)\.ico/)?.[1];
                const website = row.domain
                  ? `https://${row.domain}`
                  : (row.url ?? `https://${hostname ?? row.name}`);
                return (
                  <Badge
                    key={row.name}
                    asChild
                    variant="outline"
                    className={`h-8 max-w-full gap-1.5 border-transparent px-2.5 transition-colors hover:brightness-95 motion-reduce:transition-none ${color}`}
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
        <p className="text-xs text-muted-foreground" role="status">
          {t("home.mapTilesCouldLoadCheckConnectionRefreshExit")}{" "}
          <button
            type="button"
            className="text-primary underline underline-offset-4"
            onClick={() => setAttempt((value) => value + 1)}
          >
            {t("common.retry")}
          </button>
        </p>
      )}
    </section>
  );
}
