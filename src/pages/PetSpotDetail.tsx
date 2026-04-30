import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Loader2, MapPin, Star, Phone, Globe, Clock, Trash2, Calendar, ExternalLink,
} from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { CATEGORY_META, SpotCategory } from "@/components/community/PetSpotCard";

interface Spot {
  id: string;
  created_by: string;
  name: string;
  category: SpotCategory;
  description: string | null;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  photo_urls: string[];
  contact_phone: string | null;
  website: string | null;
  opening_hours: string | null;
  offers_bookings: boolean;
  created_at: string;
}

interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export default function PetSpotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) fetchAll();
  }, [id]);

  const fetchAll = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: spotData, error: spotErr } = await supabase
        .from("pet_spots")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (spotErr) throw spotErr;
      if (!spotData) {
        toast({ variant: "destructive", title: "Spot not found" });
        navigate(-1);
        return;
      }
      setSpot(spotData as Spot);

      const { data: reviewData } = await supabase
        .from("spot_reviews")
        .select("id, user_id, rating, comment, created_at")
        .eq("spot_id", id)
        .order("created_at", { ascending: false });

      const userIds = Array.from(new Set((reviewData || []).map((r: any) => r.user_id)));
      let profileMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, username, avatar_url")
          .in("user_id", userIds);
        (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });
      }
      const enriched = (reviewData || []).map((r: any) => ({ ...r, profile: profileMap[r.user_id] })) as Review[];
      setReviews(enriched);

      if (user) {
        const mine = enriched.find((r) => r.user_id === user.id) || null;
        setMyReview(mine);
        if (mine) {
          setRating(mine.rating);
          setComment(mine.comment || "");
        }
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !id || rating < 1) {
      toast({ variant: "destructive", title: "Please select a rating" });
      return;
    }
    setSubmitting(true);
    try {
      if (myReview) {
        const { error } = await supabase
          .from("spot_reviews")
          .update({ rating, comment: comment.trim() || null })
          .eq("id", myReview.id);
        if (error) throw error;
        toast({ title: "Review updated" });
      } else {
        const { error } = await supabase
          .from("spot_reviews")
          .insert({ spot_id: id, user_id: user.id, rating, comment: comment.trim() || null });
        if (error) throw error;
        toast({ title: "Review posted ⭐" });
      }
      await fetchAll();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!myReview) return;
    try {
      const { error } = await supabase.from("spot_reviews").delete().eq("id", myReview.id);
      if (error) throw error;
      setRating(0);
      setComment("");
      setMyReview(null);
      toast({ title: "Review removed" });
      await fetchAll();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleDeleteSpot = async () => {
    if (!spot) return;
    try {
      const { error } = await supabase.from("pet_spots").delete().eq("id", spot.id);
      if (error) throw error;
      toast({ title: "Spot deleted" });
      navigate("/spots");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  if (loading || !spot) {
    return (
      <MobileLayout>
        <PageHeader title="Spot" showBack />
        <div className="p-4 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  const meta = CATEGORY_META[spot.category];
  const Icon = meta.icon;
  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  const isOwner = user?.id === spot.created_by;
  const mapsUrl = spot.latitude != null && spot.longitude != null
    ? `https://www.google.com/maps/search/?api=1&query=${spot.latitude},${spot.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.location_label)}`;

  return (
    <MobileLayout>
      <PageHeader title={spot.name} showBack />

      <div className="pb-8">
        {/* Photos */}
        {spot.photo_urls && spot.photo_urls.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto p-4 snap-x">
            {spot.photo_urls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`${spot.name} ${i + 1}`}
                className="h-48 w-72 object-cover rounded-xl flex-shrink-0 snap-start bg-muted"
                loading="lazy"
              />
            ))}
          </div>
        ) : (
          <div className={`m-4 h-48 rounded-xl flex items-center justify-center ${meta.color}`}>
            <Icon className="h-16 w-16" />
          </div>
        )}

        <div className="px-4 space-y-4">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="secondary" className={`gap-1 ${meta.color} border-0`}>
                <Icon className="h-3 w-3" />
                {meta.label}
              </Badge>
              {spot.offers_bookings && (
                <Badge variant="outline" className="gap-1 text-sky-700 border-sky-200">
                  <Calendar className="h-3 w-3" />
                  Accepts bookings
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground">{spot.name}</h1>
            {avg !== null && (
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-semibold">{avg.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({reviews.length} reviews)</span>
              </div>
            )}
          </div>

          {spot.description && (
            <p className="text-sm text-foreground whitespace-pre-wrap">{spot.description}</p>
          )}

          {/* Info */}
          <Card>
            <CardContent className="p-4 space-y-3 text-sm">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 text-foreground hover:text-primary"
              >
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <span className="flex-1">{spot.location_label}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
              {spot.opening_hours && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <span className="whitespace-pre-wrap">{spot.opening_hours}</span>
                </div>
              )}
              {spot.contact_phone && (
                <a href={`tel:${spot.contact_phone}`} className="flex items-center gap-2 text-foreground hover:text-primary">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{spot.contact_phone}</span>
                </a>
              )}
              {spot.website && (
                <a
                  href={spot.website.startsWith("http") ? spot.website : `https://${spot.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-foreground hover:text-primary truncate"
                >
                  <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{spot.website}</span>
                </a>
              )}
            </CardContent>
          </Card>

          {/* Owner controls */}
          {isOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete this spot
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {spot.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove the spot and all its reviews. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSpot} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Review form */}
          {!isGuest && user && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <Label className="font-semibold">{myReview ? "Your review" : "Leave a review"}</Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      className="p-1"
                      aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                    >
                      <Star className={`h-7 w-7 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Share your experience (optional)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 1000))}
                  rows={3}
                  maxLength={1000}
                />
                <div className="flex gap-2">
                  <Button onClick={handleSubmitReview} disabled={submitting || rating < 1} className="flex-1">
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {myReview ? "Update review" : "Post review"}
                  </Button>
                  {myReview && (
                    <Button variant="outline" onClick={handleDeleteReview} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reviews list */}
          <div className="space-y-3">
            <h2 className="font-semibold text-foreground">Reviews ({reviews.length})</h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">Be the first to review this spot.</p>
            ) : (
              reviews.map((r) => (
                <Card key={r.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={r.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {(r.profile?.display_name || r.profile?.username || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">
                            {r.profile?.display_name || r.profile?.username || "User"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(r.created_at), "MMM d, yyyy")}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
                            />
                          ))}
                        </div>
                        {r.comment && (
                          <p className="text-sm text-foreground mt-1.5 whitespace-pre-wrap">{r.comment}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
