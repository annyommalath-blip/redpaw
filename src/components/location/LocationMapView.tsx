import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pinSvg = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
  <defs>
    <filter id="shadow-lmv" x="-20%" y="-10%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.3"/>
    </filter>
  </defs>
  <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="${color}" filter="url(#shadow-lmv)"/>
  <circle cx="14" cy="14" r="6" fill="white"/>
</svg>`;

interface LocationMapViewProps {
  latitude: number;
  longitude: number;
  label?: string;
  /** Marker color — defaults to red for lost dogs */
  color?: string;
  height?: number;
}

export function LocationMapView({
  latitude,
  longitude,
  label,
  color = "#ef4444",
  height = 180,
}: LocationMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      zoomControl: true,
      scrollWheelZoom: false,
      dragging: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 20,
      subdomains: "abcd",
    }).addTo(map);

    const icon = L.divIcon({
      html: pinSvg(color),
      className: "",
      iconSize: [28, 40],
      iconAnchor: [14, 40],
      popupAnchor: [0, -42],
    });

    const marker = L.marker([latitude, longitude], { icon }).addTo(map);
    if (label) {
      marker.bindPopup(`<span style="font-size:12px;font-weight:600;">${label}</span>`).openPopup();
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, label, color]);

  return (
    <div
      ref={containerRef}
      style={{ height, minHeight: height }}
      className="w-full rounded-xl overflow-hidden"
    />
  );
}
