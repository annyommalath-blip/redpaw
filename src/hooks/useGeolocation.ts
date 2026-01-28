import { useState, useCallback } from "react";

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  locationLabel: string;
  locationSource: "gps" | "manual";
  loading: boolean;
  error: string | null;
  permissionDenied: boolean;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    locationLabel: "",
    locationSource: "manual",
    loading: false,
    error: null,
    permissionDenied: false,
  });

  // Reverse geocode coordinates to get a readable address
  const reverseGeocode = useCallback(async (lat: number, lon: number): Promise<string> => {
    try {
      const response = await fetch(
        `${NOMINATIM_URL}/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "RedPaw App",
          },
        }
      );
      
      if (!response.ok) throw new Error("Geocoding failed");
      
      const data = await response.json();
      const address = data.address;
      
      // Build a short location label
      const parts: string[] = [];
      if (address.neighbourhood) parts.push(address.neighbourhood);
      else if (address.suburb) parts.push(address.suburb);
      else if (address.district) parts.push(address.district);
      
      if (address.city) parts.push(address.city);
      else if (address.town) parts.push(address.town);
      else if (address.village) parts.push(address.village);
      
      if (address.state) parts.push(address.state);
      if (address.postcode) parts.push(address.postcode);
      
      return parts.slice(0, 3).join(", ") || data.display_name?.split(",").slice(0, 2).join(",") || "Unknown location";
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
  }, []);

  // Forward geocode an address to coordinates
  const forwardGeocode = useCallback(async (address: string): Promise<{ lat: number; lon: number; label: string } | null> => {
    try {
      const response = await fetch(
        `${NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "RedPaw App",
          },
        }
      );
      
      if (!response.ok) throw new Error("Geocoding failed");
      
      const data = await response.json();
      if (data.length === 0) return null;
      
      const result = data[0];
      return {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        label: result.display_name?.split(",").slice(0, 3).join(",") || address,
      };
    } catch (error) {
      console.error("Forward geocoding error:", error);
      return null;
    }
  }, []);

  // Request current location from device
  const requestLocation = useCallback(async (): Promise<void> => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
        loading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      const { latitude, longitude } = position.coords;
      const label = await reverseGeocode(latitude, longitude);

      setState({
        latitude,
        longitude,
        locationLabel: label,
        locationSource: "gps",
        loading: false,
        error: null,
        permissionDenied: false,
      });
    } catch (error: any) {
      const isPermissionDenied = error.code === 1;
      setState(prev => ({
        ...prev,
        loading: false,
        error: isPermissionDenied
          ? "Location access denied. You can enter location manually."
          : "Unable to get your location. Please enter it manually.",
        permissionDenied: isPermissionDenied,
      }));
    }
  }, [reverseGeocode]);

  // Set location manually
  const setManualLocation = useCallback(
    async (lat: number, lon: number, label?: string) => {
      const locationLabel = label || (await reverseGeocode(lat, lon));
      setState({
        latitude: lat,
        longitude: lon,
        locationLabel,
        locationSource: "manual",
        loading: false,
        error: null,
        permissionDenied: false,
      });
    },
    [reverseGeocode]
  );

  // Set location from text input only
  const setLocationFromText = useCallback((text: string) => {
    setState(prev => ({
      ...prev,
      locationLabel: text,
      locationSource: "manual",
      latitude: null,
      longitude: null,
    }));
  }, []);

  // Search for an address and set location
  const searchAddress = useCallback(
    async (address: string): Promise<boolean> => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const result = await forwardGeocode(address);
      
      if (result) {
        setState({
          latitude: result.lat,
          longitude: result.lon,
          locationLabel: result.label,
          locationSource: "manual",
          loading: false,
          error: null,
          permissionDenied: false,
        });
        return true;
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: "Could not find that address. Try a different search.",
        }));
        return false;
      }
    },
    [forwardGeocode]
  );

  // Reset state
  const reset = useCallback(() => {
    setState({
      latitude: null,
      longitude: null,
      locationLabel: "",
      locationSource: "manual",
      loading: false,
      error: null,
      permissionDenied: false,
    });
  }, []);

  return {
    ...state,
    requestLocation,
    setManualLocation,
    setLocationFromText,
    searchAddress,
    reverseGeocode,
    reset,
  };
}
