import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Plus, Camera } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedList, AnimatedItem } from "@/components/ui/animated-list";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useFeed } from "@/hooks/useFeed";
import { supabase } from "@/integrations/supabase/client";
import PostCard from "@/components/feed/PostCard";
import CreatePostSheet from "@/components/feed/CreatePostSheet";
import { toast } from "sonner";

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCount: notificationCount } = useNotifications();
  const { posts, loading, fetchPosts, toggleLike, repost, deletePost } = useFeed();
  const [showCreate, setShowCreate] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("display_name, first_name, avatar_url")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => setUserProfile(data));
    }
  }, [user]);

  const handleShare = async (post: any) => {
    // Share to inbox — copy link for now
    const url = `${window.location.origin}/`;
    try {
      await navigator.share?.({ title: post.caption || "Check this out!", url });
    } catch {
      await navigator.clipboard?.writeText(url);
      toast.success("Link copied!");
    }
  };

  const handleDelete = async (postId: string) => {
    await deletePost(postId);
    toast.success("Post deleted");
  };

  const handleRepost = async (postId: string) => {
    await repost(postId);
    toast.success("Reposted! 🔄");
  };

  if (loading) {
    return (
      <MobileLayout>
        <PageHeader title={t("home.title")} subtitle={t("home.subtitle")} />
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              </div>
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-8 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <PageHeader
        title={t("home.title")}
        subtitle={t("home.subtitle")}
        action={
          <Button size="icon" variant="ghost" onClick={() => navigate("/notifications")} className="relative rounded-xl">
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs border-2 border-card"
              >
                {notificationCount > 9 ? "9+" : notificationCount}
              </Badge>
            )}
          </Button>
        }
      />

      <div className="p-4 space-y-4">
        {/* Compose prompt */}
        <AnimatedItem>
          <GlassCard
            variant="light"
            hover
            className="p-3 cursor-pointer"
            onClick={() => setShowCreate(true)}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground flex-1">{t("home.writeCaption")}</p>
              <Button size="sm" className="rounded-xl">{t("common.post")}</Button>
            </div>
          </GlassCard>
        </AnimatedItem>

        {/* Feed */}
        {posts.length > 0 ? (
          <AnimatedList className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLikeToggle={toggleLike}
                onRepost={handleRepost}
                onDelete={handleDelete}
                onShare={handleShare}
              />
            ))}
          </AnimatedList>
        ) : (
          <AnimatedItem delay={0.1}>
            <GlassCard variant="light" className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-1">{t("home.noPostsYet")}</h3>
                  <p className="text-sm text-muted-foreground">{t("home.beFirstToShare")}</p>
                </div>
                <Button className="rounded-xl" onClick={() => setShowCreate(true)}>
                  {t("home.createPost")}
                </Button>
              </div>
            </GlassCard>
          </AnimatedItem>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-24 right-5 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-40 hover:scale-105 transition-transform active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </button>

      <CreatePostSheet
        open={showCreate}
        onOpenChange={setShowCreate}
        onPostCreated={fetchPosts}
        userProfile={userProfile}
      />
    </MobileLayout>
  );
}
