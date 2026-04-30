import { MapPin, Star, Coffee, ShoppingBag, Trees, Stethoscope, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDistanceLabel } from "@/lib/distanceUtils";

export type SpotCategory = "food_drink" | "shops_malls" | "outdoor_stays" | "pet_services";

export const CATEGORY_META: Record<SpotCategory, { label: string; icon: typeof Coffee; color: string }> = {
  food_drink: { label: "Food & Drink", icon: Coffee, color: "text-amber-600 bg-amber-50" },
  shops_malls: { label: "Shops & Malls", icon: ShoppingBag, color: "text-violet-600 bg-violet-50" },
  outdoor_stays: { label: "Outdoor & Stays", icon: Trees, color: "text-emerald-600 bg-emerald-50" },
  pet_services: { label: "Pet Services", icon: Stethoscope, color: "text-sky-600 bg-sky-50" },
};

interface PetSpotCardProps {
  id: string;
  name: string;
  category: SpotCategory;
  description: string | null;
  locationLabel: string;
  latitude: number | null;
  longitude: number | null;
  photoUrls: string[];
  offersBookings: boolean;
  averageRating: number | null;
  reviewCount: number;
  viewerLatitude: number | null;
  viewerLongitude: number | null;
  onClick?: () => void;
}

export function PetSpotCard({
  name,
  category,
  description,
  locationLabel,
  latitude,
  longitude,
  photoUrls,
  offersBookings,
  averageRating,
  reviewCount,
  viewerLatitude,
  viewerLongitude,
  onClick,
}: PetSpotCardProps) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  const distance = getDistanceLabel(viewerLatitude, viewerLongitude, latitude, longitude);
  const cover = photoUrls?.[0];

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
      onClick={onClick}
    >
      <div className="flex gap-3 p-3">
        {cover ? (
          <img
            src={cover}
            alt={name}
            loading="lazy"
            className="h-24 w-24 rounded-xl object-cover flex-shrink-0 bg-muted"
          />
        ) : (
          <div className={`h-24 w-24 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.color}`}>
            <Icon className="h-8 w-8" />
          </div>
        )}

        <CardContent className="p-0 flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground truncate">{name}</h3>
            {distance && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">{distance}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge variant="secondary" className={`text-[10px] gap-1 ${meta.color} border-0`}>
              <Icon className="h-3 w-3" />
              {meta.label}
            </Badge>
            {offersBookings && (
              <Badge variant="outline" className="text-[10px] gap-1 text-sky-700 border-sky-200">
                <Calendar className="h-3 w-3" />
                Bookings
              </Badge>
            )}
          </div>

          {description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">{description}</p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1 min-w-0">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{locationLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 mt-1.5">
            {averageRating !== null ? (
              <>
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-medium">{averageRating.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({reviewCount})</span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">No reviews yet</span>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
