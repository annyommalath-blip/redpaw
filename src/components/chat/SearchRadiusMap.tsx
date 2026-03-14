import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface SearchRadiusMapProps {
  center: [number, number];
  innerRadiusKm: number;
  outerRadiusKm: number;
  label: string;
}

export function SearchRadiusMap({ center, innerRadiusKm, outerRadiusKm, label }: SearchRadiusMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center,
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(map);

    // Custom paw marker
    const markerIcon = L.divIcon({
      html: `<div style="background:hsl(0,72%,51%);width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      className: "",
    });

    L.marker(center, { icon: markerIcon }).addTo(map).bindPopup(`<b>Last Seen</b><br/>${label}`);

    // Inner radius (most likely zone) - red/orange
    L.circle(center, {
      radius: innerRadiusKm * 1000,
      color: "hsl(0, 72%, 51%)",
      fillColor: "hsl(0, 72%, 51%)",
      fillOpacity: 0.15,
      weight: 2,
      dashArray: "5, 5",
    }).addTo(map).bindPopup(`Most likely zone: ${innerRadiusKm} km radius`);

    // Outer radius (extended search) - amber
    L.circle(center, {
      radius: outerRadiusKm * 1000,
      color: "hsl(38, 92%, 50%)",
      fillColor: "hsl(38, 92%, 50%)",
      fillOpacity: 0.08,
      weight: 2,
      dashArray: "8, 4",
    }).addTo(map).bindPopup(`Extended search: ${outerRadiusKm} km radius`);

    // Fit bounds to outer circle
    const bounds = L.latLng(center[0], center[1]).toBounds(outerRadiusKm * 2000);
    map.fitBounds(bounds, { padding: [20, 20] });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [center, innerRadiusKm, outerRadiusKm, label]);

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-border">
      <div className="bg-destructive/10 px-3 py-2 flex items-center gap-2 text-sm">
        <MapPin className="h-4 w-4 text-destructive" />
        <span className="font-medium text-destructive">Search Radius Map</span>
      </div>
      <div ref={mapRef} className="h-[250px] w-full" />
      <div className="bg-muted px-3 py-2 flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          Most likely ({innerRadiusKm} km)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
          Extended ({outerRadiusKm} km)
        </div>
      </div>
    </div>
  );
}
