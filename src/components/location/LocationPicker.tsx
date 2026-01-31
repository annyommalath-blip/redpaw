import { useState, useEffect, useRef, forwardRef } from "react";
import { MapPin, Navigation, Search, X, Loader2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon in Leaflet with bundlers
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  locationLabel: string;
  locationSource: "gps" | "manual";
  loading: boolean;
  error: string | null;
  permissionDenied: boolean;
  onRequestLocation: () => void;
  onManualLocation: (lat: number, lon: number, label?: string) => void;
  onLocationTextChange: (text: string) => void;
  onSearchAddress: (address: string) => Promise<boolean>;
  required?: boolean;
  placeholder?: string;
  description?: string;
}

export const LocationPicker = forwardRef<HTMLDivElement, LocationPickerProps>(function LocationPicker({
  latitude,
  longitude,
  locationLabel,
  locationSource,
  loading,
  error,
  permissionDenied,
  onRequestLocation,
  onManualLocation,
  onLocationTextChange,
  onSearchAddress,
  required = false,
  placeholder = "Enter location or use GPS",
  description,
}, ref) {
  const { t } = useTranslation();
  const [showMap, setShowMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const hasCoordinates = latitude !== null && longitude !== null;

  // Initialize map when showing
  useEffect(() => {
    if (!showMap || !mapContainerRef.current) return;

    // Default to Seattle if no location
    const defaultLat = latitude ?? 47.6062;
    const defaultLng = longitude ?? -122.3321;

    // Create map
    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: hasCoordinates ? 15 : 10,
      zoomControl: true,
    });

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Add draggable marker
    const marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);
    
    // Handle marker drag end
    marker.on("dragend", async () => {
      const pos = marker.getLatLng();
      onManualLocation(pos.lat, pos.lng);
    });

    // Handle map click to move marker
    map.on("click", async (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onManualLocation(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [showMap]);

  // Update marker position when coordinates change
  useEffect(() => {
    if (mapRef.current && markerRef.current && latitude && longitude) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapRef.current.setView([latitude, longitude], 15);
    }
  }, [latitude, longitude]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const success = await onSearchAddress(searchQuery.trim());
    if (success) {
      setSearchQuery("");
      setShowMap(true);
    }
    setSearching(false);
  };

  const handleUseGPS = () => {
    onRequestLocation();
    setShowMap(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          {t("location.label")} {required && <span className="text-destructive">*</span>}
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-primary"
          onClick={handleUseGPS}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4 mr-1" />
          )}
          {t("location.useGPS")}
        </Button>
      </div>

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {/* Location Input with Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={locationLabel}
            onChange={(e) => onLocationTextChange(e.target.value)}
            placeholder={placeholder}
            className={cn(
              hasCoordinates && "pr-8",
              error && "border-destructive"
            )}
          />
          {hasCoordinates && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success text-success-foreground text-xs">
                ✓
              </span>
            </div>
          )}
        </div>
        {!hasCoordinates && locationLabel && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onSearchAddress(locationLabel)}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Location Preview Card */}
      {hasCoordinates && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-3 bg-muted/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium truncate max-w-[200px]">
                  {locationLabel || t("location.locationSet")}
                </span>
                {locationSource === "gps" && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    GPS
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowMap(!showMap)}
              >
                {showMap ? t("location.hideMap") : t("location.editOnMap")}
              </Button>
            </div>

            {/* Map Container */}
            {showMap && (
              <div className="relative">
                <div
                  ref={mapContainerRef}
                  className="h-48 w-full"
                  style={{ minHeight: "192px" }}
                />
                <div className="absolute bottom-2 left-2 right-2 bg-background/90 backdrop-blur-sm rounded-lg p-2">
                  <div className="flex gap-2">
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("location.searchAddress")}
                      className="h-8 text-sm"
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-8"
                      onClick={handleSearch}
                      disabled={searching}
                    >
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  {t("location.dragOrTap")}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Show map button when no coordinates but user wants to pick manually */}
      {!hasCoordinates && !showMap && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowMap(true)}
        >
          <MapPin className="h-4 w-4 mr-2" />
          {t("location.pickOnMap")}
        </Button>
      )}

      {/* Map for initial selection */}
      {!hasCoordinates && showMap && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-2 bg-muted/50 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("location.tapOrDrag")}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowMap(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <div
                ref={mapContainerRef}
                className="h-48 w-full"
                style={{ minHeight: "192px" }}
              />
              <div className="absolute bottom-2 left-2 right-2 bg-background/90 backdrop-blur-sm rounded-lg p-2">
                <div className="flex gap-2">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("location.searchAddress")}
                    className="h-8 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-8"
                    onClick={handleSearch}
                    disabled={searching}
                  >
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});
