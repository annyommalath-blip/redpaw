import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationLinkProps {
  latitude?: number | null;
  longitude?: number | null;
  locationLabel: string;
  className?: string;
  showIcon?: boolean;
  iconClassName?: string;
}

/**
 * Displays a location as a clickable link that opens Google Maps externally.
 * Uses coordinates if available, otherwise falls back to text search.
 */
export function LocationLink({
  latitude,
  longitude,
  locationLabel,
  className,
  showIcon = true,
  iconClassName,
}: LocationLinkProps) {
  const hasCoordinates = latitude !== null && latitude !== undefined && 
                         longitude !== null && longitude !== undefined;

  // Build the Google Maps URL
  const url = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationLabel)}`;

  if (!locationLabel) return null;

  // Use an anchor tag with target="_blank" - this works properly in both
  // web preview and Capacitor native apps, opening in system browser
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "flex items-center gap-2 text-sm text-primary hover:text-primary/80 hover:underline transition-colors text-left",
        className
      )}
    >
      {showIcon && (
        <MapPin className={cn("h-4 w-4 shrink-0", iconClassName)} />
      )}
      <span className="truncate">{locationLabel}</span>
    </a>
  );
}
