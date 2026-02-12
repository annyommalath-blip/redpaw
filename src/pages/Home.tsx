import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bell, Camera } from "lucide-react";
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
import SendPostSheet from "@/components/feed/SendPostSheet";
import { toast } from "sonner";
import type { PostData } from "@/components/feed/PostCard";

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { unreadCount: notificationCount } = useNotifications();
  const { posts, loading, fetchPosts, toggleLike, repost, deletePost, updatePost } = useFeed();
  const [showCreate, setShowCreate] = useState(false);
  const [sharePost, setSharePost] = useState<PostData | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const highlightPostId = searchParams.get("highlightPost");
  const highlightedRef = useRef(false);

  // Scroll to highlighted post once posts are loaded
  useEffect(() => {
    if (highlightPostId && !loading && posts.length > 0 && !highlightedRef.current) {
      highlightedRef.current = true;
      // Small delay to let DOM render
      setTimeout(() => {
        const el = document.getElementById(`post-${highlightPostId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-primary", "ring-offset-2", "rounded-2xl");
          setTimeout(() => {
            el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "rounded-2xl");
          }, 3000);
        }
        // Clean up URL
        setSearchParams({}, { replace: true });
      }, 300);
    }
  }, [highlightPostId, loading, posts]);

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

  const handleShare = (post: PostData) => {
    setSharePost(post);
  };

  const handleDelete = async (postId: string) => {
    await deletePost(postId);
    toast.success("Post deleted");
  };

  const handleRepost = async (postId: string, reposted: boolean) => {
    await repost(postId, reposted);
    toast.success(reposted ? "Reposted! 🔄" : "Repost removed");
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
              <div key={post.id} id={`post-${post.id}`} className="transition-all duration-500">
                <PostCard
                  post={post}
                  onLikeToggle={toggleLike}
                  onRepost={handleRepost}
                  onDelete={handleDelete}
                  onShare={handleShare}
                  onEdit={updatePost}
                />
              </div>
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


      <CreatePostSheet
        open={showCreate}
        onOpenChange={setShowCreate}
        onPostCreated={fetchPosts}
        userProfile={userProfile}
      />

      <SendPostSheet
        open={!!sharePost}
        onOpenChange={(open) => !open && setSharePost(null)}
        postId={sharePost?.id}
        postCaption={sharePost?.caption || sharePost?.original_post?.caption || null}
        postPhotoUrl={sharePost?.photo_url || sharePost?.original_post?.photo_url || null}
        postPhotoUrls={sharePost?.photo_urls || sharePost?.original_post?.photo_urls || null}
        postAuthorName={
          (sharePost?.author?.username ? `@${sharePost.author.username}` : sharePost?.author?.display_name) ||
          (sharePost?.original_post?.author?.username ? `@${sharePost.original_post.author.username}` : sharePost?.original_post?.author?.display_name) ||
          null
        }
      />
    </MobileLayout>
  );
}
