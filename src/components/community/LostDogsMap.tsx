import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Dog } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LostDogMarker {
  id: string;
  dogName: string;
  breed: string | null;
  photoUrl: string | null;
  latitude: number;
  longitude: number;
  locationLabel: string | null;
  createdAt: Date;
}

interface FoundDogMarker {
  id: string;
  photoUrl: string | null;
  locationLabel: string;
  latitude: number;
  longitude: number;
  foundAt: Date;
}

interface LostDogsMapProps {
  lostAlerts: LostDogMarker[];
  foundDogs: FoundDogMarker[];
  viewerLatitude: number | null;
  viewerLongitude: number | null;
}

const lostPinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
  <defs>
    <filter id="shadow-l" x="-25%" y="-10%" width="150%" height="150%">
      <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#00000040"/>
    </filter>
  </defs>
  <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 28 16 28s16-16 16-28C32 7.163 24.837 0 16 0z" fill="#ef4444" filter="url(#shadow-l)"/>
  <circle cx="16" cy="15" r="7.5" fill="white"/>
  <text x="16" y="19.5" text-anchor="middle" font-size="10" fill="#ef4444">🐾</text>
</svg>`;

const foundPinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
  <defs>
    <filter id="shadow-f" x="-25%" y="-10%" width="150%" height="150%">
      <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#00000040"/>
    </filter>
  </defs>
  <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 28 16 28s16-16 16-28C32 7.163 24.837 0 16 0z" fill="#22c55e" filter="url(#shadow-f)"/>
  <circle cx="16" cy="15" r="7.5" fill="white"/>
  <text x="16" y="19.5" text-anchor="middle" font-size="10" fill="#22c55e">🐶</text>
</svg>`;

const viewerDotSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
  <circle cx="11" cy="11" r="10" fill="#3b82f6" fill-opacity="0.18"/>
  <circle cx="11" cy="11" r="6" fill="#3b82f6" fill-opacity="0.35"/>
  <circle cx="11" cy="11" r="4" fill="#2563eb"/>
  <circle cx="9.5" cy="9.5" r="1.2" fill="white" fill-opacity="0.7"/>
</svg>`;

const lostIcon = L.divIcon({ html: lostPinSvg, className: "", iconSize: [32, 44], iconAnchor: [16, 44], popupAnchor: [0, -46] });
const foundIcon = L.divIcon({ html: foundPinSvg, className: "", iconSize: [32, 44], iconAnchor: [16, 44], popupAnchor: [0, -46] });
const viewerIcon = L.divIcon({ html: viewerDotSvg, className: "", iconSize: [22, 22], iconAnchor: [11, 11] });

/** CartoDB Positron — clean light-gray tiles matching the desired style */
const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

export function LostDogsMap({ lostAlerts, foundDogs, viewerLatitude, viewerLongitude }: LostDogsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Center on user's location if available, else a broad US view
    const hasViewer = viewerLatitude !== null && viewerLongitude !== null;
    const centerLat = hasViewer ? viewerLatitude! : 39.5;
    const centerLng = hasViewer ? viewerLongitude! : -98.35;
    const initialZoom = hasViewer ? 14 : 4;

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: initialZoom,
      zoomControl: true,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 20,
      subdomains: "abcd",
    }).addTo(map);

    // Viewer location pulse marker
    if (hasViewer) {
      L.marker([viewerLatitude!, viewerLongitude!], { icon: viewerIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup("<strong style='font-size:12px'>You are here</strong>");
    }

    // Lost dog markers
    lostAlerts.forEach((alert) => {
      const timeAgo = getTimeAgo(alert.createdAt);
      const imgHtml = alert.photoUrl
        ? `<img src="${alert.photoUrl}" style="width:100%;height:80px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />`
        : "";
      const popupHtml = `
        <div style="min-width:170px;font-family:system-ui,sans-serif;padding:2px;">
          ${imgHtml}
          <div style="font-weight:700;font-size:14px;color:#111;line-height:1.2;">${alert.dogName}</div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:3px;">${alert.breed || "Unknown breed"}</div>
          <span style="display:inline-block;background:#fee2e2;color:#ef4444;font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;margin-bottom:5px;">🚨 LOST</span>
          ${alert.locationLabel ? `<div style="font-size:11px;color:#9ca3af;margin-bottom:1px;">📍 ${alert.locationLabel}</div>` : ""}
          <div style="font-size:11px;color:#9ca3af;margin-bottom:8px;">🕐 ${timeAgo}</div>
          <a href="#" data-id="${alert.id}" data-type="lost" style="display:block;text-align:center;background:#ef4444;color:white;padding:6px 12px;border-radius:8px;font-size:12px;text-decoration:none;font-weight:600;">View Alert →</a>
        </div>`;

      const marker = L.marker([alert.latitude, alert.longitude], { icon: lostIcon }).addTo(map).bindPopup(popupHtml, { maxWidth: 210, className: "redpaw-popup" });

      marker.on("popupopen", () => {
        setTimeout(() => {
          document.querySelector(`a[data-id="${alert.id}"][data-type="lost"]`)?.addEventListener("click", (e) => {
            e.preventDefault();
            navigate(`/lost-alert/${alert.id}`);
          });
        }, 80);
      });
    });

    // Found dog markers
    foundDogs.forEach((found) => {
      const timeAgo = getTimeAgo(found.foundAt);
      const imgHtml = found.photoUrl
        ? `<img src="${found.photoUrl}" style="width:100%;height:80px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />`
        : "";
      const popupHtml = `
        <div style="min-width:170px;font-family:system-ui,sans-serif;padding:2px;">
          ${imgHtml}
          <div style="font-weight:700;font-size:14px;color:#111;">Found Dog</div>
          <span style="display:inline-block;background:#dcfce7;color:#22c55e;font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;margin-bottom:5px;">🐶 FOUND</span>
          ${found.locationLabel ? `<div style="font-size:11px;color:#9ca3af;margin-bottom:1px;">📍 ${found.locationLabel}</div>` : ""}
          <div style="font-size:11px;color:#9ca3af;margin-bottom:8px;">🕐 ${timeAgo}</div>
          <a href="#" data-id="${found.id}" data-type="found" style="display:block;text-align:center;background:#22c55e;color:white;padding:6px 12px;border-radius:8px;font-size:12px;text-decoration:none;font-weight:600;">View Report →</a>
        </div>`;

      const marker = L.marker([found.latitude, found.longitude], { icon: foundIcon }).addTo(map).bindPopup(popupHtml, { maxWidth: 210, className: "redpaw-popup" });

      marker.on("popupopen", () => {
        setTimeout(() => {
          document.querySelector(`a[data-id="${found.id}"][data-type="found"]`)?.addEventListener("click", (e) => {
            e.preventDefault();
            navigate(`/found-dog/${found.id}`);
          });
        }, 80);
      });
    });

    // If we have the viewer's location, stay zoomed in on them.
    // Only use fitBounds when there is no viewer location (show all markers).
    if (!hasViewer) {
      const allPoints: L.LatLngExpression[] = [
        ...lostAlerts.map(a => [a.latitude, a.longitude] as L.LatLngExpression),
        ...foundDogs.map(f => [f.latitude, f.longitude] as L.LatLngExpression),
      ];
      if (allPoints.length > 1) {
        map.fitBounds(L.latLngBounds(allPoints), { padding: [60, 60], maxZoom: 14 });
      } else if (allPoints.length === 1) {
        map.setView(allPoints[0], 13);
      }
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const hasData = lostAlerts.length > 0 || foundDogs.length > 0;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border shadow-sm" style={{ height: "62vh", minHeight: 340 }}>
      <div ref={mapContainerRef} className="h-full w-full" />

      {/* Legend */}
      <div className="absolute bottom-4 left-3 bg-white/90 backdrop-blur-sm rounded-2xl px-3 py-2.5 shadow-md text-xs space-y-1.5 z-[1000] border border-border">
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none">🚨</span>
          <span className="text-foreground font-medium">Lost dog</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none">🐶</span>
          <span className="text-foreground font-medium">Found dog</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-blue-500 ring-2 ring-blue-300" />
          <span className="text-foreground font-medium">You</span>
        </div>
      </div>

      {/* Alert count badge */}
      {hasData && (
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow text-xs font-semibold text-foreground z-[1000] border border-border">
          {lostAlerts.length > 0 && <span className="text-red-500">{lostAlerts.length} lost</span>}
          {lostAlerts.length > 0 && foundDogs.length > 0 && <span className="text-muted-foreground mx-1">·</span>}
          {foundDogs.length > 0 && <span className="text-green-500">{foundDogs.length} found</span>}
        </div>
      )}

      {/* No data overlay */}
      {!hasData && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 z-[999]">
          <Dog className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground font-medium">No lost or found dogs nearby</p>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
