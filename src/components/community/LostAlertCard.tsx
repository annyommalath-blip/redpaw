import { MessageCircle, Dog, Eye, Calendar, Scale } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { calculateAge } from "@/lib/ageCalculator";
import { LocationLink } from "@/components/location/LocationLink";
import { getDistanceLabel } from "@/lib/distanceUtils";
import { useTranslation } from "react-i18next";

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
  onContact,
}: LostAlertCardProps) {
  const { t } = useTranslation();
  const isActive = status === "active";
  const navigate = useNavigate();
  
  // Calculate distance from viewer
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
    <Card 
      className={`overflow-hidden cursor-pointer transition-shadow hover:shadow-md ${isActive ? "border-lost" : "border-success"}`}
      onClick={handleViewDetails}
    >
      <CardContent className="p-0">
        {/* Header with status */}
        <div className={`px-4 py-2 ${isActive ? "bg-lost" : "bg-success"}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">
              {isActive ? `🚨 ${t("community.lostDog")}` : `✅ ${t("lost.found")}`}
            </span>
            <Badge variant="outline" className="bg-white/20 text-white border-white/30">
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </Badge>
          </div>
        </div>

        <div className="p-4">
          <div className="flex gap-4">
            {/* Dog Photo */}
            <div className="h-24 w-24 rounded-xl overflow-hidden bg-muted flex items-center justify-center shrink-0">
              {photoUrl ? (
                <img src={photoUrl} alt={dogName} className="h-full w-full object-cover" />
              ) : (
                <Dog className="h-10 w-10 text-muted-foreground" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-foreground">{dogName}</h3>
              <p className="text-sm text-muted-foreground">{breed}</p>
              
              {/* Age & Weight */}
              <div className="flex flex-wrap gap-2 mt-1">
                {age && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{age.includes("-") ? calculateAge(age) : age}</span>
                  </div>
                )}
                {weight && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Scale className="h-3 w-3" />
                    <span>{weight} {weightUnit || "lbs"}</span>
                  </div>
                )}
              </div>
              
              <p className="text-sm text-foreground mt-2 line-clamp-2">{description}</p>
            </div>
          </div>

          {/* Location - clickable link to Google Maps */}
          <div className="mt-3 flex items-center gap-2">
            <LocationLink
              latitude={latitude}
              longitude={longitude}
              locationLabel={locationLabel || lastSeenLocation}
              className="text-muted-foreground hover:text-primary"
            />
            {distanceLabel && (
              <span className="text-xs text-muted-foreground shrink-0">• {distanceLabel} {t("common.away")}</span>
            )}
          </div>
          </div>

          {isActive && (
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={handleReportSighting}>
                <Eye className="h-4 w-4 mr-2" />
                {t("common.reportSighting")}
              </Button>
              <Button className="flex-1 bg-primary" onClick={handleContact}>
                <MessageCircle className="h-4 w-4 mr-2" />
                {t("common.contact")}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
