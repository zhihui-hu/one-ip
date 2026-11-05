import { useEffect, useRef, useState } from "react";
import { ToolCard, Pending } from "@/components/toolkit";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { attachMapLayers, loadMapConfig, mapExternalUrl } from "@/lib/map";
import { maskedIp } from "@/lib/network";
import type { Geo } from "@/lib/types";
import { hideIpAtom } from "@/store/privacy";
import { useAtomValue } from "jotai";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { ExternalLink, LocateFixed } from "lucide-react";
import "./ip.css";

const mapNoteClass =
  "mt-[5px] text-[10px] leading-normal text-muted-foreground";

export function LocationMap({ geo }: { geo: Geo }) {
  const hidden = useAtomValue(hideIpAtom);
  const { latitude, longitude } = geo;
  const valid =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;
  const location =
    [geo.country, geo.region, geo.city]
      .filter(Boolean)
      .filter((value, index, all) => all.indexOf(value) === index)
      .join(" · ") || t("ip.ipLocation");
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!container.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [valid]);
  useEffect(() => {
    const element = container.current;
    if (!visible || !valid || !element) return;
    let disposed = false;
    let observer: ResizeObserver | undefined;
    let instance: LeafletMap | undefined;
    let detachLayers = () => {};
    setLoaded(false);
    setTileError(false);
    void import("leaflet")
      .then(({ default: L }) => {
        if (disposed) return;
        instance = L.map(element, {
          scrollWheelZoom: false,
          minZoom: 2,
          maxZoom: 15,
          zoomControl: false,
        }).setView([latitude, longitude], 7);
        map.current = instance;
        instance.attributionControl.setPrefix(false);
        L.control
          .zoom({
            position: "bottomright",
            zoomInTitle: t("ip.zoomIn"),
            zoomOutTitle: t("ip.zoomOut"),
          })
          .addTo(instance);
        const mapInstance = instance;
        void loadMapConfig().then((config) => {
          if (disposed) return;
          detachLayers = attachMapLayers(
            L.tileLayer,
            mapInstance,
            config,
            () => {
              setLoaded(true);
              setTileError(false);
            },
            () => setTileError(true),
          );
        });
        const label = document.createElement("span");
        label.textContent = location;
        L.circleMarker([latitude, longitude], {
          radius: 10,
          className: "ip-location-ping",
          color: "#1976d2",
          weight: 2,
          fill: false,
          fillOpacity: 0,
          interactive: false,
        }).addTo(instance);
        L.circleMarker([latitude, longitude], {
          radius: 7,
          color: "#fff",
          weight: 2,
          fillColor: "#1976d2",
          fillOpacity: 1,
        })
          .bindTooltip(label, { direction: "top", offset: [0, -8] })
          .addTo(instance);
        observer = new ResizeObserver(() => instance?.invalidateSize());
        observer.observe(element);
      })
      .catch(() => {
        if (!disposed) setTileError(true);
      });
    return () => {
      disposed = true;
      detachLayers();
      observer?.disconnect();
      instance?.remove();
      map.current = null;
    };
  }, [visible, valid, latitude, longitude, location, attempt]);
  return (
    <ToolCard
      title={
        <span className="flex items-center justify-between gap-2">
          <span>{t("ip.locationMap")}</span>
          {valid && (
            <span className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("ip.recenterLocation")}
                title={t("ip.recenterLocation")}
                onClick={() =>
                  map.current?.setView([latitude, longitude], 7, {
                    animate: false,
                  })
                }
              >
                <LocateFixed className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" asChild>
                <a
                  href={mapExternalUrl(latitude, longitude, location)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("ip.viewLargerMap")}
                  title={t("ip.viewLargerMap")}
                >
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            </span>
          )}
        </span>
      }
      className="ip-map-card"
    >
      {valid ? (
        <>
          <div className="mb-1.5 flex flex-wrap [align-items:start] justify-between gap-x-2 gap-y-1 text-[12px]">
            <span>{location}</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {latitude.toFixed(2)}, {longitude.toFixed(2)}
            </span>
          </div>
          <div className="relative overflow-hidden rounded-[8px] border border-border">
            <div
              ref={container}
              className="ip-location-map exit-map z-0 h-60 w-full min-w-0 max-md:h-45"
              aria-label={t("ip.approximateLocationOf", [
                maskedIp(geo.ip, hidden),
              ])}
              aria-busy={!loaded && !tileError}
            />
            {!loaded && !tileError && (
              <div
                className="pointer-events-none absolute inset-0 grid place-items-center bg-muted text-[12px]"
                role="status"
              >
                <Pending>{t("ip.loadingMap")}</Pending>
              </div>
            )}
          </div>
          {tileError && (
            <p className={mapNoteClass} role="status">
              {t("ip.mapTilesAreUnavailableLocationDetailsRemainAvailable")}{" "}
              <button
                type="button"
                className="cursor-pointer text-primary underline"
                onClick={() => setAttempt((value) => value + 1)}
              >
                {t("common.retry")}
              </button>
            </p>
          )}
          <p className={mapNoteClass}>
            {geo.source ? `${geo.source} · ` : ""}
            {t("ip.approximateIpLocationDeviceSExactPosition")}
          </p>
        </>
      ) : (
        <p className="text-[0.78rem] text-muted-foreground">
          {t("ip.noCoordinatesAvailableToDisplayAMap")}
        </p>
      )}
    </ToolCard>
  );
}
