import { useState, useEffect, useCallback } from "react";

interface ViewerLocationState {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
  permissionDenied: boolean;
  hasRequested: boolean;
}

const SESSION_KEY = "viewer_location";

/**
 * Hook to get and cache the viewer's current location for the session.
 * Used for calculating distances in Community feed.
 */
export function useViewerLocation() {
  const [state, setState] = useState<ViewerLocationState>(() => {
    // Try to restore from session storage
    try {
      const cached = sessionStorage.getItem(SESSION_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          latitude: parsed.latitude,
          longitude: parsed.longitude,
          loading: false,
          error: null,
          permissionDenied: false,
          hasRequested: true,
        };
      }
    } catch {
      // Ignore parse errors
    }
    
    return {
      latitude: null,
      longitude: null,
      loading: false,
      error: null,
      permissionDenied: false,
      hasRequested: false,
    };
  });

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: "Geolocation not supported",
        loading: false,
        hasRequested: true,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, // Use lower accuracy for speed
          timeout: 10000,
          maximumAge: 300000, // Cache for 5 minutes
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Cache in session storage
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ latitude, longitude }));
      } catch {
        // Ignore storage errors
      }

      setState({
        latitude,
        longitude,
        loading: false,
        error: null,
        permissionDenied: false,
        hasRequested: true,
      });
    } catch (error: any) {
      const isPermissionDenied = error.code === 1;
      setState({
        latitude: null,
        longitude: null,
        loading: false,
        error: isPermissionDenied ? "Location access denied" : "Could not get location",
        permissionDenied: isPermissionDenied,
        hasRequested: true,
      });
    }
  }, []);

  const refreshLocation = useCallback(() => {
    // Clear cache and re-request
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore
    }
    requestLocation();
  }, [requestLocation]);

  // Auto-request on mount if not already requested
  useEffect(() => {
    if (!state.hasRequested && !state.loading) {
      requestLocation();
    }
  }, [state.hasRequested, state.loading, requestLocation]);

  return {
    ...state,
    requestLocation,
    refreshLocation,
    hasLocation: state.latitude !== null && state.longitude !== null,
  };
}
