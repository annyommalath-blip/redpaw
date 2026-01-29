import { MessageCircle, Dog, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { LocationLink } from "@/components/location/LocationLink";
import { getDistanceLabel } from "@/lib/distanceUtils";

interface FoundDogCardProps {
  id: string;
  photoUrls: string[];
  description?: string | null;
  locationLabel: string;
  latitude?: number | null;
  longitude?: number | null;
  viewerLatitude?: number | null;
  viewerLongitude?: number | null;
  foundAt: Date;
  status: "active" | "reunited" | "closed";
  createdAt: Date;
  onContact: () => void;
}

export function FoundDogCard({
  id,
  photoUrls,
  description,
  locationLabel,
  latitude,
  longitude,
  viewerLatitude,
  viewerLongitude,
  foundAt,
  status,
  createdAt,
  onContact,
}: FoundDogCardProps) {
  const navigate = useNavigate();
  const isActive = status === "active";
  const isReunited = status === "reunited";
  
  // Calculate distance from viewer
  const distanceLabel = getDistanceLabel(
    viewerLatitude ?? null,
    viewerLongitude ?? null,
    latitude,
    longitude
  );

  const handleViewDetails = () => {
    navigate(`/found-dog/${id}`);
  };

  const handleReplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to detail page with reply=true to auto-focus the reply input
    navigate(`/found-dog/${id}?reply=true`);
  };

  const handleContact = (e: React.MouseEvent) => {
    e.stopPropagation();
    onContact();
  };

  const formatFoundTime = (date: Date) => {
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return `Found today ${format(date, "h:mm a")}`;
    } else if (diffHours < 48) {
      return `Found yesterday ${format(date, "h:mm a")}`;
    } else {
      return `Found ${format(date, "MMM d")} at ${format(date, "h:mm a")}`;
    }
  };

  const primaryPhoto = photoUrls[0];

  return (
    <Card 
      className={`overflow-hidden cursor-pointer transition-shadow hover:shadow-md ${
        isReunited ? "border-success" : isActive ? "border-success" : "border-muted"
      }`}
      onClick={handleViewDetails}
    >
      <CardContent className="p-0">
        {/* Header with status */}
        <div className={`px-4 py-2 ${isReunited ? "bg-success" : isActive ? "bg-success" : "bg-muted"}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-success-foreground">
              {isReunited ? "✅ REUNITED" : "🐕 FOUND DOG"}
            </span>
            <Badge variant="outline" className="bg-background/20 text-success-foreground border-background/30">
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </Badge>
          </div>
        </div>

        <div className="p-4">
          <div className="flex gap-4">
            {/* Dog Photo */}
            <div className="h-24 w-24 rounded-xl overflow-hidden bg-muted flex items-center justify-center shrink-0">
              {primaryPhoto ? (
                <img src={primaryPhoto} alt="Found dog" className="h-full w-full object-cover" />
              ) : (
                <Dog className="h-10 w-10 text-muted-foreground" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-foreground">Found Dog</h3>
              
              {/* Found Time */}
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatFoundTime(foundAt)}</span>
              </div>
              
              {description && (
                <p className="text-sm text-foreground mt-2 line-clamp-2">{description}</p>
              )}
            </div>
          </div>

          {/* Location - clickable link to Google Maps */}
          <div className="mt-3 flex items-center gap-2">
            <LocationLink
              latitude={latitude}
              longitude={longitude}
              locationLabel={locationLabel}
              className="text-muted-foreground hover:text-primary"
            />
            {distanceLabel && (
              <span className="text-xs text-muted-foreground shrink-0">
                • {distanceLabel} away
              </span>
            )}
          </div>

          {/* Actions */}
          {isActive && (
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleReplyClick}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Reply
              </Button>
              <Button className="flex-1 bg-primary" onClick={handleContact}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Message
              </Button>
            </div>
          )}

          {isReunited && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-success">
              <CheckCircle className="h-4 w-4" />
              <span>This dog has been reunited with their owner!</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
