import { useEffect, useRef, useState } from "react";
import { attachMapLayers, loadMapConfig } from "@/lib/map";
import type { Geo } from "@/lib/types";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import "../home.css";

export function IpCardMap({ geo }: { geo?: Geo }) {
  const latitude = geo?.latitude;
  const longitude = geo?.longitude;
  const valid =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;
  const container = useRef<HTMLDivElement>(null);
  const attribution = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const element = container.current;
    if (!valid || !element) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [valid]);

  useEffect(() => {
    const element = container.current;
    if (!visible || !valid || !element) return;
    let disposed = false;
    let instance: LeafletMap | undefined;
    let observer: ResizeObserver | undefined;
    let detachLayers = () => {};
    setLoaded(false);
    void Promise.all([import("leaflet"), loadMapConfig()])
      .then(([{ default: L }, config]) => {
        if (disposed) return;
        instance = L.map(element, {
          zoomControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
          touchZoom: false,
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
        }).setView([latitude, longitude], 6);
        instance.attributionControl.setPrefix(false);
        // Keep provider credits outside the faded background and above the card link.
        const credits = instance.attributionControl.getContainer();
        if (credits && attribution.current) attribution.current.append(credits);
        detachLayers = attachMapLayers(
          L.tileLayer,
          instance,
          config,
          () => {
            if (!disposed) setLoaded(true);
          },
          () => {
            if (!disposed) setLoaded(false);
          },
        );
        L.circleMarker([latitude, longitude], {
          radius: 6,
          color: "#ffffff",
          weight: 2,
          fillColor: "#3976d2",
          fillOpacity: 1,
          interactive: false,
        }).addTo(instance);
        observer = new ResizeObserver(() => instance?.invalidateSize());
        observer.observe(element);
      })
      .catch(() => {
        if (!disposed) setLoaded(false);
      });
    return () => {
      disposed = true;
      detachLayers();
      observer?.disconnect();
      instance?.remove();
    };
  }, [visible, valid, latitude, longitude]);

  if (!valid) return null;
  return (
    <>
      <div
        ref={container}
        className="home-ip-map pointer-events-none absolute inset-y-0 right-0 left-auto z-0 w-[58%] bg-transparent opacity-0 [mask-image:linear-gradient(to_right,transparent,#000_45%)] data-[loaded=true]:opacity-55"
        data-loaded={loaded}
        aria-hidden="true"
      />
      <div
        ref={attribution}
        className="home-ip-map-attribution absolute right-2 bottom-1 z-20 data-[loaded=false]:invisible"
        data-loaded={loaded}
      />
    </>
  );
}
