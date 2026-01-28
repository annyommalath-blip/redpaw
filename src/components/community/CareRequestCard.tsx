import { MapPin, Clock, Dog, Check, ChevronRight, Banknote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

type CareType = "walk" | "watch" | "overnight" | "check-in";

interface DogInfo {
  name: string;
  breed?: string | null;
  photo_url?: string | null;
}

interface CareRequestCardProps {
  id: string;
  dogName: string;
  breed: string;
  photoUrl?: string;
  careType: CareType;
  timeWindow: string;
  location: string;
  notes?: string;
  payOffered?: string;
  createdAt: Date;
  status: "open" | "closed";
  isAssigned?: boolean;
  hasApplied?: boolean;
  onClick?: () => void;
  // New prop for multiple dogs
  dogs?: DogInfo[];
}

const careTypeConfig: Record<CareType, { icon: string; label: string; color: string }> = {
  walk: { icon: "🚶", label: "Walk", color: "bg-success text-success-foreground" },
  watch: { icon: "👀", label: "Short Watch", color: "bg-warning text-warning-foreground" },
  overnight: { icon: "🌙", label: "Overnight", color: "bg-primary text-primary-foreground" },
  "check-in": { icon: "👋", label: "Check-in", color: "bg-accent text-accent-foreground" },
};

export function CareRequestCard({
  dogName,
  breed,
  photoUrl,
  careType,
  timeWindow,
  location,
  notes,
  payOffered,
  createdAt,
  status,
  isAssigned,
  hasApplied,
  onClick,
  dogs,
}: CareRequestCardProps) {
  const config = careTypeConfig[careType];
  
  // Use dogs array if available, otherwise fall back to single dog props
  const displayDogs = dogs && dogs.length > 0 
    ? dogs 
    : [{ name: dogName, breed, photo_url: photoUrl }];
  
  const isMultipleDogs = displayDogs.length > 1;

  return (
    <Card 
      className={`overflow-hidden ${onClick ? "cursor-pointer hover:border-primary transition-colors" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={config.color}>
              {config.icon} {config.label}
            </Badge>
            {isMultipleDogs && (
              <Badge variant="outline" className="border-primary text-primary">
                🐾 {displayDogs.length} Dogs
              </Badge>
            )}
            {isAssigned && (
              <Badge className="bg-primary text-primary-foreground">
                <Check className="h-3 w-3 mr-1" />
                Assigned
              </Badge>
            )}
          {hasApplied && !isAssigned && (
            <Badge className="bg-success text-success-foreground">
              <Check className="h-3 w-3 mr-1" />
              Applied
            </Badge>
          )}
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </span>
        </div>

        {/* Dogs Display */}
        {isMultipleDogs ? (
          <div className="flex gap-2 mb-3">
            {/* Stacked dog photos */}
            <div className="flex -space-x-3">
              {displayDogs.slice(0, 4).map((dog, index) => (
                <div 
                  key={index}
                  className="h-12 w-12 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-background"
                  style={{ zIndex: displayDogs.length - index }}
                >
                  {dog.photo_url ? (
                    <img src={dog.photo_url} alt={dog.name} className="h-full w-full object-cover" />
                  ) : (
                    <Dog className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              ))}
              {displayDogs.length > 4 && (
                <div 
                  className="h-12 w-12 rounded-full bg-muted flex items-center justify-center border-2 border-background text-xs font-medium text-muted-foreground"
                >
                  +{displayDogs.length - 4}
                </div>
              )}
            </div>
            {/* Dog names */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground">
                {displayDogs.map(d => d.name).join(", ")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {displayDogs.length} dogs need care together
              </p>
            </div>
            {onClick && (
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 self-center" />
            )}
          </div>
        ) : (
          <div className="flex gap-3">
            {/* Single Dog Photo */}
            <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted flex items-center justify-center shrink-0">
              {displayDogs[0].photo_url ? (
                <img src={displayDogs[0].photo_url} alt={displayDogs[0].name} className="h-full w-full object-cover" />
              ) : (
                <Dog className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground">{displayDogs[0].name || "Unknown"}</h3>
              <p className="text-sm text-muted-foreground">{displayDogs[0].breed || "Unknown breed"}</p>
            </div>

            {onClick && (
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
          </div>
        )}

        {/* Details */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{timeWindow}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
          {payOffered && (
            <div className="flex items-center gap-2 text-sm text-success font-medium">
              <Banknote className="h-4 w-4 shrink-0" />
              <span>{payOffered}</span>
            </div>
          )}
        </div>

        {notes && (
          <p className="text-sm text-foreground mt-3 line-clamp-2">{notes}</p>
        )}
      </CardContent>
    </Card>
  );
}
