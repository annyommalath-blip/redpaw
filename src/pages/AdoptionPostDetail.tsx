import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Phone, Check, X, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { CommunityComments } from "@/components/community/CommunityComments";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GuestAuthPrompt } from "@/components/auth/GuestAuthPrompt";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useConversation } from "@/hooks/useConversation";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export default function AdoptionPostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const { openConversation } = useConversation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => { fetchPost(); }, [id]);

  const fetchPost = async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase.from("adoption_posts").select("*").eq("id", id).single();
    setPost(data);
    setLoading(false);
  };

  const handleMessage = async () => {
    if (isGuest || !user) { setShowAuthPrompt(true); return; }
    if (!post || user.id === post.owner_id) return;
    await openConversation(post.owner_id, "adoption", post.id);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!post) return;
    const { error } = await supabase.from("adoption_posts").update({ status: newStatus }).eq("id", post.id);
    if (!error) { toast({ title: `Status updated to ${newStatus}` }); fetchPost(); }
  };

  if (loading) {
    return (
      <MobileLayout>
        <PageHeader title="Adoption" showBack onBack={() => navigate(-1)} />
        <div className="p-4 space-y-4">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </MobileLayout>
    );
  }

  if (!post) {
    return (
      <MobileLayout>
        <PageHeader title="Adoption" showBack onBack={() => navigate(-1)} />
        <div className="p-4 text-center text-muted-foreground">Post not found.</div>
      </MobileLayout>
    );
  }

  const isOwner = user?.id === post.owner_id;
  const photos = post.photo_urls || [];

  return (
    <MobileLayout>
      <PageHeader title={post.pet_name} showBack onBack={() => navigate(-1)} />

      <div className="p-4 space-y-4">
        {/* Photo Gallery */}
        {photos.length > 0 && (
          <div className="relative rounded-2xl overflow-hidden">
            <img src={photos[photoIndex]} alt={post.pet_name} className="w-full h-72 object-cover" />
            {photos.length > 1 && (
              <>
                <button className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1" onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1" onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}>
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs">
                  {photoIndex + 1} / {photos.length}
                </div>
              </>
            )}
          </div>
        )}

        {/* Details */}
        <GlassCard variant="light" className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{post.pet_name}</h2>
            <Badge variant="outline" className={cn(
              post.status === "available" && "bg-success/15 text-success border-success/25",
              post.status === "pending" && "bg-warning/15 text-warning border-warning/25",
              post.status === "adopted" && "bg-primary/15 text-primary border-primary/25",
            )}>
              {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="capitalize">{post.pet_type}</Badge>
            {post.breed && <Badge variant="outline">{post.breed}</Badge>}
            {post.age && <Badge variant="outline">{post.age}</Badge>}
            {post.size && <Badge variant="outline">{post.size}</Badge>}
            {post.is_spayed_neutered && <Badge variant="outline">Spayed/Neutered ✓</Badge>}
            {post.is_vaccinated && <Badge variant="outline">Vaccinated ✓</Badge>}
          </div>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" /> {post.location_label}
          </div>

          {post.temperament && (
            <div>
              <h4 className="text-sm font-semibold mb-0.5">Temperament</h4>
              <p className="text-sm text-muted-foreground">{post.temperament}</p>
            </div>
          )}

          {post.reason && (
            <div>
              <h4 className="text-sm font-semibold mb-0.5">Reason for rehoming</h4>
              <p className="text-sm text-muted-foreground">{post.reason}</p>
            </div>
          )}

          {post.adoption_fee != null && (
            <div className="text-sm">
              <span className="font-semibold">Adoption fee: </span>
              {post.adoption_fee > 0 ? `$${post.adoption_fee}` : "Free"}
            </div>
          )}

          {post.contact_phone && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" /> {post.contact_phone}
            </div>
          )}

          {/* Status changer for owner */}
          {isOwner && (
            <div className="pt-2 border-t">
              <label className="text-sm font-medium mb-1 block">Update Status</label>
              <Select value={post.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="adopted">Adopted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {!isOwner && post.status !== "adopted" && (
            <Button className="w-full rounded-xl" onClick={handleMessage}>
              <MessageCircle className="h-4 w-4 mr-2" /> Message About Adoption
            </Button>
          )}
        </GlassCard>

        {/* Comments */}
        <CommunityComments contextType="adoption" contextId={post.id} />
      </div>

      <GuestAuthPrompt open={showAuthPrompt} onOpenChange={setShowAuthPrompt} />
    </MobileLayout>
  );
}
