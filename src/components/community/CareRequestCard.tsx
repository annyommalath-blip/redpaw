import { MapPin, Clock, MessageCircle, Dog, DollarSign, Check, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

type CareType = "walk" | "watch" | "overnight" | "check-in";

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
  onRespond?: () => void;
  onClick?: () => void;
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
  onRespond,
  onClick,
}: CareRequestCardProps) {
  const config = careTypeConfig[careType];
  const isOpen = status === "open" && !isAssigned;

  return (
    <Card 
      className={`overflow-hidden ${isOpen ? "" : "opacity-80"} ${onClick ? "cursor-pointer hover:border-primary transition-colors" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge className={config.color}>
              {config.icon} {config.label}
            </Badge>
            {isAssigned && (
              <Badge className="bg-primary text-primary-foreground">
                <Check className="h-3 w-3 mr-1" />
                Assigned
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </span>
        </div>

        <div className="flex gap-3">
          {/* Dog Photo */}
          <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted flex items-center justify-center shrink-0">
            {photoUrl ? (
              <img src={photoUrl} alt={dogName} className="h-full w-full object-cover" />
            ) : (
              <Dog className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground">{dogName}</h3>
            <p className="text-sm text-muted-foreground">{breed}</p>
          </div>

          {onClick && (
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
        </div>

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
              <DollarSign className="h-4 w-4 shrink-0" />
              <span>{payOffered}</span>
            </div>
          )}
        </div>

        {notes && (
          <p className="text-sm text-foreground mt-3 line-clamp-2">{notes}</p>
        )}

        {/* Action */}
        {isOpen && onRespond && (
          <Button 
            className="w-full mt-4" 
            onClick={(e) => {
              e.stopPropagation();
              onRespond();
            }}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Respond to Request
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
