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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    let url: string;
    if (hasCoordinates) {
      // Open Google Maps with exact coordinates
      url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    } else {
      // Fall back to text search
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationLabel)}`;
    }
    
    // Open in new tab / system browser (works with Capacitor)
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!locationLabel) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2 text-sm text-primary hover:text-primary/80 hover:underline transition-colors text-left",
        className
      )}
    >
      {showIcon && (
        <MapPin className={cn("h-4 w-4 shrink-0", iconClassName)} />
      )}
      <span className="truncate">{locationLabel}</span>
    </button>
  );
}
