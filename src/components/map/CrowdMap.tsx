import { useEffect, useRef } from "react";
import L from "leaflet";
import { levelMeta, type CrowdLevel } from "@/lib/crowd";

export interface MapMarker {
  key: string;
  name: string;
  lat: number;
  lng: number;
  level: CrowdLevel | null;
  count: number;
}

interface Props {
  markers: MapMarker[];
  selected: { lat: number; lng: number; name: string } | null;
  flyTo: { lat: number; lng: number; zoom?: number; nonce: number } | null;
  onPick: (lat: number, lng: number) => void;
  onMarkerSelect: (marker: MapMarker) => void;
}

const INDIA_CENTER: L.LatLngExpression = [22.35, 79.5];

function markerIcon(level: CrowdLevel | null, active: boolean) {
  const color = level ? levelMeta(level).token : "var(--color-muted-foreground)";
  return L.divIcon({
    className: "",
    html: `<div class="cs-marker ${active ? "cs-marker-pulse" : ""}" style="--dot:${color};position:relative"><div class="cs-marker-dot"></div></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export default function CrowdMap({ markers, selected, flyTo, onPick, onMarkerSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const pinRef = useRef<L.Marker | null>(null);
  const handlers = useRef({ onPick, onMarkerSelect });
  handlers.current = { onPick, onMarkerSelect };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: INDIA_CENTER,
      zoom: 5,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      maxZoom: 19,
    }).addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => {
      handlers.current.onPick(e.latlng.lat, e.latlng.lng);
    });
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      pinRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const m of markers) {
      const isActive = !!selected && m.key === `${selected.lat.toFixed(4)},${selected.lng.toFixed(4)}`;
      const marker = L.marker([m.lat, m.lng], { icon: markerIcon(m.level, isActive) });
      marker.bindTooltip(
        `<strong>${m.name}</strong><br/>${m.level ? levelMeta(m.level).label : "No data"} · ${m.count} report${m.count === 1 ? "" : "s"}`,
        { direction: "top", offset: [0, -12], className: "cs-tooltip" },
      );
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e as unknown as Event);
        handlers.current.onMarkerSelect(m);
      });
      marker.addTo(layer);
    }
  }, [markers, selected]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!selected) {
      if (pinRef.current) {
        map.removeLayer(pinRef.current);
        pinRef.current = null;
      }
      return;
    }
    const icon = L.divIcon({
      className: "",
      html: `<div style="position:relative;display:grid;place-items:center;width:34px;height:44px">
        <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 43C17 43 31 27.5 31 17C31 9.26801 24.732 3 17 3C9.26801 3 3 9.26801 3 17C3 27.5 17 43 17 43Z" fill="oklch(0.72 0.16 178)" stroke="white" stroke-opacity="0.85" stroke-width="2"/>
          <circle cx="17" cy="17" r="5" fill="oklch(0.17 0.03 275)"/>
        </svg>
      </div>`,
      iconSize: [34, 44],
      iconAnchor: [17, 43],
    });
    if (pinRef.current) {
      pinRef.current.setLatLng([selected.lat, selected.lng]);
      pinRef.current.setIcon(icon);
    } else {
      const pin = L.marker([selected.lat, selected.lng], { icon, draggable: true, zIndexOffset: 1000 });
      pin.on("dragend", () => {
        const p = pin.getLatLng();
        handlers.current.onPick(p.lat, p.lng);
      });
      pin.addTo(map);
      pinRef.current = pin;
    }
  }, [selected]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;
    map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom ?? 15, { duration: 1.1 });
  }, [flyTo]);

  return <div ref={containerRef} className="h-full w-full" />;
}
