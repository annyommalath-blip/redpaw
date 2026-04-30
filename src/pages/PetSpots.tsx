import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PawPrint, Plus, Navigation, MapPin } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyState } from "@/components/ui/empty-state";
import { AnimatedList } from "@/components/ui/animated-list";
import { supabase } from "@/integrations/supabase/client";
import { useViewerLocation } from "@/hooks/useViewerLocation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { calculateDistanceKm } from "@/lib/distanceUtils";
import { PetSpotCard, SpotCategory, CATEGORY_META } from "@/components/community/PetSpotCard";

type Filter = "all" | SpotCategory;

interface SpotRow {
  id: string;
  name: string;
  category: SpotCategory;
  description: string | null;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  photo_urls: string[];
  offers_bookings: boolean;
  created_at: string;
}

export default function PetSpotsPage() {
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const { toast } = useToast();
  const viewer = useViewerLocation();
  const [spots, setSpots] = useState<SpotRow[]>([]);
  const [reviewStats, setReviewStats] = useState<Record<string, { avg: number; count: number }>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    fetchSpots();
  }, []);

  const fetchSpots = async () => {
    setLoading(true);
    try {
      const { data: spotsData, error } = await supabase
        .from("pet_spots")
        .select("id, name, category, description, location_label, latitude, longitude, photo_urls, offers_bookings, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSpots((spotsData as SpotRow[]) || []);

      const ids = (spotsData || []).map((s: any) => s.id);
      if (ids.length > 0) {
        const { data: reviewData } = await supabase
          .from("spot_reviews")
          .select("spot_id, rating")
          .in("spot_id", ids);

        const stats: Record<string, { sum: number; count: number }> = {};
        (reviewData || []).forEach((r: any) => {
          if (!stats[r.spot_id]) stats[r.spot_id] = { sum: 0, count: 0 };
          stats[r.spot_id].sum += r.rating;
          stats[r.spot_id].count += 1;
        });
        const finalStats: Record<string, { avg: number; count: number }> = {};
        Object.entries(stats).forEach(([id, s]) => {
          finalStats[id] = { avg: s.sum / s.count, count: s.count };
        });
        setReviewStats(finalStats);
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to load spots", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const sorted = useMemo(() => {
    const filtered = filter === "all" ? spots : spots.filter((s) => s.category === filter);
    if (viewer.latitude == null || viewer.longitude == null) return filtered;
    return [...filtered].sort((a, b) => {
      const da = a.latitude != null && a.longitude != null
        ? calculateDistanceKm(viewer.latitude!, viewer.longitude!, a.latitude, a.longitude)
        : Infinity;
      const db = b.latitude != null && b.longitude != null
        ? calculateDistanceKm(viewer.latitude!, viewer.longitude!, b.latitude, b.longitude)
        : Infinity;
      return da - db;
    });
  }, [spots, filter, viewer.latitude, viewer.longitude]);

  const handleAdd = () => {
    if (isGuest || !user) {
      navigate("/auth");
      return;
    }
    navigate("/create?type=spot");
  };

  return (
    <MobileLayout>
      <PageHeader
        title="Pet-Friendly Spots"
        subtitle="Discover places that welcome your pet"
        showBack
      />

      <div className="p-4 space-y-4">
        {/* Location status */}
        {!viewer.hasLocation && (
          <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-muted/40 border border-dashed">
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {viewer.loading ? "Getting your location..." : "Enable location to sort by distance"}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={viewer.requestLocation}
              disabled={viewer.loading}
              className="h-8"
            >
              <Navigation className="h-3.5 w-3.5 mr-1" />
              {viewer.loading ? "..." : "Use GPS"}
            </Button>
          </div>
        )}

        {/* Add spot button */}
        <Button onClick={handleAdd} className="w-full" size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Register a pet-friendly spot
        </Button>

        {/* Category filter */}
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(v) => v && setFilter(v as Filter)}
          className="justify-start bg-muted/30 p-1 rounded-xl flex-wrap w-fit max-w-full"
        >
          <ToggleGroupItem value="all" size="sm" className="text-xs px-3 rounded-lg data-[state=on]:bg-white data-[state=on]:shadow-sm">
            All
          </ToggleGroupItem>
          {(Object.keys(CATEGORY_META) as SpotCategory[]).map((cat) => (
            <ToggleGroupItem key={cat} value={cat} size="sm" className="text-xs px-3 rounded-lg data-[state=on]:bg-white data-[state=on]:shadow-sm">
              {CATEGORY_META[cat].label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {/* Spots list */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<PawPrint className="h-10 w-10 text-muted-foreground" />}
            title={filter === "all" ? "No spots yet" : `No ${CATEGORY_META[filter as SpotCategory]?.label} spots yet`}
            description="Be the first to register a pet-friendly place near you."
          />
        ) : (
          <AnimatedList className="space-y-3">
            {sorted.map((spot) => {
              const stats = reviewStats[spot.id];
              return (
                <PetSpotCard
                  key={spot.id}
                  id={spot.id}
                  name={spot.name}
                  category={spot.category}
                  description={spot.description}
                  locationLabel={spot.location_label}
                  latitude={spot.latitude}
                  longitude={spot.longitude}
                  photoUrls={spot.photo_urls || []}
                  offersBookings={spot.offers_bookings}
                  averageRating={stats?.avg ?? null}
                  reviewCount={stats?.count ?? 0}
                  viewerLatitude={viewer.latitude}
                  viewerLongitude={viewer.longitude}
                  onClick={() => navigate(`/spot/${spot.id}`)}
                />
              );
            })}
          </AnimatedList>
        )}
      </div>
    </MobileLayout>
  );
}
