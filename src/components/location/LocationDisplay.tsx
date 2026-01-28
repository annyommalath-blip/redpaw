import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationDisplayProps {
  locationLabel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md";
}

export function LocationDisplay({
  locationLabel,
  latitude,
  longitude,
  className,
  showIcon = true,
  size = "sm",
}: LocationDisplayProps) {
  // Use label if available, otherwise show coordinates or fallback
  const displayText = locationLabel 
    || (latitude && longitude ? `${latitude.toFixed(2)}, ${longitude.toFixed(2)}` : null);

  if (!displayText) return null;

  return (
    <div className={cn(
      "flex items-center gap-1 text-muted-foreground",
      size === "sm" ? "text-xs" : "text-sm",
      className
    )}>
      {showIcon && <MapPin className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />}
      <span className="truncate">{displayText}</span>
    </div>
  );
}

// Simple inline location badge
interface LocationBadgeProps {
  locationLabel?: string | null;
  locationSource?: "gps" | "manual" | null;
  className?: string;
}

export function LocationBadge({
  locationLabel,
  locationSource,
  className,
}: LocationBadgeProps) {
  if (!locationLabel) return null;

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs",
      className
    )}>
      <MapPin className="h-3 w-3" />
      <span className="truncate max-w-[150px]">{locationLabel}</span>
      {locationSource === "gps" && (
        <span className="text-[10px] bg-primary/20 text-primary px-1 rounded">GPS</span>
      )}
    </div>
  );
}
