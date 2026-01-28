/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns distance in kilometers
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert kilometers to miles
 */
export function kmToMiles(km: number): number {
  return km * 0.621371;
}

/**
 * Format distance for display
 * @param distanceKm Distance in kilometers
 * @param useMetric Whether to use km (true) or miles (false)
 * @returns Formatted string like "2.3 mi away" or "Nearby"
 */
export function formatDistance(
  distanceKm: number,
  useMetric: boolean = false
): string {
  if (useMetric) {
    if (distanceKm < 0.1) return "Nearby";
    return `${distanceKm.toFixed(1)} km`;
  } else {
    const miles = kmToMiles(distanceKm);
    if (miles < 0.1) return "Nearby";
    return `${miles.toFixed(1)} mi`;
  }
}

/**
 * Detect if user's locale prefers metric system
 * US, UK, Myanmar, and Liberia use imperial
 */
export function prefersMetric(): boolean {
  try {
    const locale = navigator.language || "en-US";
    const imperialCountries = ["en-US", "en-LR", "my-MM"];
    return !imperialCountries.some(c => locale.startsWith(c.split("-")[0]) && locale.includes(c.split("-")[1]));
  } catch {
    return false; // Default to miles
  }
}

/**
 * Calculate and format distance between viewer and a post
 */
export function getDistanceLabel(
  viewerLat: number | null,
  viewerLon: number | null,
  postLat: number | null | undefined,
  postLon: number | null | undefined,
  useMetric?: boolean
): string | null {
  if (
    viewerLat === null ||
    viewerLon === null ||
    postLat === null ||
    postLat === undefined ||
    postLon === null ||
    postLon === undefined
  ) {
    return null;
  }

  const distanceKm = calculateDistanceKm(viewerLat, viewerLon, postLat, postLon);
  const metric = useMetric ?? prefersMetric();
  return formatDistance(distanceKm, metric);
}
