import { MapPin, MessageCircle, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; class: string }> = {
  available: { label: "Available", class: "bg-success/15 text-success border-success/25" },
  pending: { label: "Pending", class: "bg-warning/15 text-warning border-warning/25" },
  adopted: { label: "Adopted", class: "bg-primary/15 text-primary border-primary/25" },
};

interface AdoptionPostCardProps {
  id: string;
  petName: string;
  petType: string;
  breed?: string | null;
  age?: string | null;
  size?: string | null;
  photoUrls: string[];
  locationLabel: string;
  status: string;
  adoptionFee?: number | null;
  adoptionFeeCurrency?: string | null;
  createdAt: Date;
  onClick?: () => void;
}

export function AdoptionPostCard({
  id, petName, petType, breed, age, size, photoUrls,
  locationLabel, status, adoptionFee, adoptionFeeCurrency,
  createdAt, onClick,
}: AdoptionPostCardProps) {
  const { t } = useTranslation();
  const statusCfg = statusConfig[status] || statusConfig.available;
  const isAdopted = status === "adopted";

  return (
    <GlassCard 
      variant="light" 
      hover={!!onClick} 
      className={cn("overflow-hidden animate-fade-in", isAdopted && "opacity-75")}
      onClick={onClick}
    >
      {/* Photo */}
      <div className="relative h-48 w-full overflow-hidden">
        {photoUrls.length > 0 ? (
          <img src={photoUrls[0]} alt={petName} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-muted flex items-center justify-center text-muted-foreground">
            🐕
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", statusCfg.class)}>
            {statusCfg.label}
          </span>
        </div>
        {photoUrls.length > 1 && (
          <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-medium">
            📷 {photoUrls.length}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-bold text-foreground text-lg">{petName}</h3>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {breed && <Badge variant="outline" className="text-xs">{breed}</Badge>}
              {age && <Badge variant="outline" className="text-xs">{age}</Badge>}
              {size && <Badge variant="outline" className="text-xs">{size}</Badge>}
              <Badge variant="outline" className="text-xs capitalize">{petType}</Badge>
            </div>
          </div>
          {onClick && <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
          <MapPin className="h-3.5 w-3.5" /> {locationLabel}
        </div>

        <div className="flex items-center justify-between mt-3">
          {adoptionFee != null && adoptionFee > 0 ? (
            <span className="text-sm font-semibold text-primary">
              ${adoptionFee.toLocaleString()} {adoptionFeeCurrency || ""}
            </span>
          ) : (
            <span className="text-sm font-semibold text-success">Free adoption</span>
          )}
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {formatDistanceToNow(createdAt, { addSuffix: false })}
          </span>
        </div>

        {!isAdopted && (
          <Button size="sm" variant="outline" className="w-full mt-3 rounded-xl" onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
            <MessageCircle className="h-4 w-4 mr-1.5" /> {t("common.message")}
          </Button>
        )}
      </div>
    </GlassCard>
  );
}
