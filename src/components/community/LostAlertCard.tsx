import { MessageCircle, Dog, Eye, Calendar, Scale } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { calculateAge } from "@/lib/ageCalculator";
import { LocationLink } from "@/components/location/LocationLink";
import { getDistanceLabel } from "@/lib/distanceUtils";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { FollowButton } from "@/components/social/FollowButton";

interface LostAlertCardProps {
  id: string;
  dogName: string;
  breed: string;
  photoUrl?: string;
  age?: string;
  weight?: string;
  weightUnit?: string;
  description: string;
  lastSeenLocation: string;
  locationLabel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  viewerLatitude?: number | null;
  viewerLongitude?: number | null;
  createdAt: Date;
  status: "active" | "resolved";
  ownerId?: string;
  onContact: () => void;
  onReportSighting?: () => void;
}

export function LostAlertCard({
  id,
  dogName,
  breed,
  photoUrl,
  age,
  weight,
  weightUnit,
  description,
  lastSeenLocation,
  locationLabel,
  latitude,
  longitude,
  viewerLatitude,
  viewerLongitude,
  createdAt,
  status,
  ownerId,
  onContact,
}: LostAlertCardProps) {
  const { t } = useTranslation();
  const isActive = status === "active";
  const navigate = useNavigate();
  
  const distanceLabel = getDistanceLabel(
    viewerLatitude ?? null,
    viewerLongitude ?? null,
    latitude,
    longitude
  );

  const handleViewDetails = () => {
    navigate(`/lost-alert/${id}`);
  };

  const handleReportSighting = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/lost-alert/${id}`);
  };

  const handleContact = (e: React.MouseEvent) => {
    e.stopPropagation();
    onContact();
  };

  return (
    <GlassCard 
      variant="light"
      hover
      className={cn(
        "overflow-hidden animate-fade-in",
        isActive && "lost-mode"
      )}
      onClick={handleViewDetails}
    >
      {/* Header with status */}
      <div className={cn(
        "px-4 py-2.5",
        isActive 
          ? "bg-gradient-to-r from-lost to-lost/80" 
          : "bg-gradient-to-r from-success to-success/80"
      )}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-white flex items-center gap-2">
            {isActive ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                {t("community.lostDog")}
              </>
            ) : (
              <>✅ {t("lost.found")}</>
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
            {photoUrl ? (
              <img src={photoUrl} alt={dogName} className="h-full w-full object-cover" />
            ) : (
              <Dog className="h-10 w-10 text-muted-foreground" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground">{dogName}</h3>
              {ownerId && <FollowButton targetUserId={ownerId} />}
            </div>
            <p className="text-sm text-muted-foreground">{breed}</p>
            
            {/* Age & Weight */}
            <div className="flex flex-wrap gap-3 mt-2">
              {age && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{age.includes("-") ? calculateAge(age) : age}</span>
                </div>
              )}
              {weight && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Scale className="h-3.5 w-3.5" />
                  <span>{weight} {weightUnit || "lbs"}</span>
                </div>
              )}
            </div>
            
            <p className="text-sm text-foreground mt-2 line-clamp-2">{description}</p>
          </div>
        </div>

        {/* Location */}
        <div className="mt-4 flex items-center gap-2">
          <LocationLink
            latitude={latitude}
            longitude={longitude}
            locationLabel={locationLabel || lastSeenLocation}
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
              onClick={handleReportSighting}
            >
              <Eye className="h-4 w-4 mr-2" />
              {t("common.reportSighting")}
            </Button>
            <Button 
              className="flex-1 rounded-xl btn-glow" 
              onClick={handleContact}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {t("common.contact")}
            </Button>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
