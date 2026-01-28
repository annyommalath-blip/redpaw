import { MapPin, Clock, MessageCircle, Dog } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface LostAlertCardProps {
  id: string;
  dogName: string;
  breed: string;
  photoUrl?: string;
  description: string;
  lastSeenLocation: string;
  createdAt: Date;
  status: "active" | "resolved";
  onContact: () => void;
  onReportSighting?: () => void;
}

export function LostAlertCard({
  dogName,
  breed,
  photoUrl,
  description,
  lastSeenLocation,
  createdAt,
  status,
  onContact,
  onReportSighting,
}: LostAlertCardProps) {
  const isActive = status === "active";

  return (
    <Card className={`overflow-hidden ${isActive ? "border-lost" : "border-success"}`}>
      <CardContent className="p-0">
        {/* Header with status */}
        <div className={`px-4 py-2 ${isActive ? "bg-lost" : "bg-success"}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">
              {isActive ? "🚨 LOST DOG" : "✅ FOUND"}
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
              <p className="text-sm text-foreground mt-2 line-clamp-2">{description}</p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{lastSeenLocation}</span>
          </div>

          {/* Actions */}
          {isActive && (
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onReportSighting}
              >
                <Clock className="h-4 w-4 mr-2" />
                Report Sighting
              </Button>
              <Button className="flex-1 bg-primary" onClick={onContact}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
