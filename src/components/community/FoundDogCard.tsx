import { MessageCircle, Dog, Clock, CheckCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { LocationLink } from "@/components/location/LocationLink";
import { getDistanceLabel } from "@/lib/distanceUtils";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isActive = status === "active";
  const isReunited = status === "reunited";
  
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
      return `${t("found.foundToday")} ${format(date, "h:mm a")}`;
    } else if (diffHours < 48) {
      return `${t("found.foundYesterday")} ${format(date, "h:mm a")}`;
    } else {
      return `${t("found.foundOn")} ${format(date, "MMM d")} at ${format(date, "h:mm a")}`;
    }
  };

  const primaryPhoto = photoUrls[0];

  return (
    <GlassCard 
      variant="light"
      hover
      className="overflow-hidden animate-fade-in"
      onClick={handleViewDetails}
    >
      {/* Header with status */}
      <div className={cn(
        "px-4 py-2.5",
        isReunited 
          ? "bg-gradient-to-r from-success to-success/80" 
          : "bg-gradient-to-r from-success to-success/80"
      )}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-white flex items-center gap-2">
            {isReunited ? (
              <>
                <CheckCircle className="h-4 w-4" />
                {t("community.reunited")}
              </>
            ) : (
              <>🐕 {t("community.foundDog")}</>
            )}
          </span>
          <span className="text-xs text-white/80 font-medium">
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex gap-4">
          {/* Dog Photo */}
          <div className="h-24 w-24 rounded-2xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shrink-0 shadow-sm">
            {primaryPhoto ? (
              <img src={primaryPhoto} alt="Found dog" className="h-full w-full object-cover" />
            ) : (
              <Dog className="h-10 w-10 text-muted-foreground" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-foreground">{t("community.foundDog")}</h3>
            
            {/* Found Time */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatFoundTime(foundAt)}</span>
            </div>
            
            {description && (
              <p className="text-sm text-foreground mt-2 line-clamp-2">{description}</p>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="mt-4 flex items-center gap-2">
          <LocationLink
            latitude={latitude}
            longitude={longitude}
            locationLabel={locationLabel}
            className="text-muted-foreground hover:text-primary text-sm"
          />
          {distanceLabel && (
            <span className="text-xs text-muted-foreground shrink-0">
              • {distanceLabel} {t("common.away")}
            </span>
          )}
        </div>

        {isActive && (
          <div className="flex gap-3 mt-4">
            <Button 
              variant="outline" 
              className="flex-1 rounded-xl" 
              onClick={handleReplyClick}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {t("common.reply")}
            </Button>
            <Button 
              className="flex-1 rounded-xl btn-glow" 
              onClick={handleContact}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {t("common.message")}
            </Button>
          </div>
        )}

        {isReunited && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-success font-medium">
            <CheckCircle className="h-4 w-4" />
            <span>{t("community.dogReunited")}</span>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
