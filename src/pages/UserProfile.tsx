import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, User, Dog, HandHeart, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { FollowButton } from "@/components/social/FollowButton";
import { AnimatedItem } from "@/components/ui/animated-list";
import PostCard from "@/components/feed/PostCard";
import type { PostData } from "@/components/feed/PostCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface UserProfileData {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  username: string | null;
}

interface UserDog {
  id: string;
  name: string;
  breed: string | null;
  photo_url: string | null;
}

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [userDogs, setUserDogs] = useState<UserDog[]>([]);
  const [careJobCount, setCareJobCount] = useState(0);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("*")
        .eq("user_id", userId)
        .limit(1);

      if (profiles && profiles.length > 0) {
        setProfile(profiles[0] as UserProfileData);
      }

      // Fetch counts in parallel
      const [followersRes, followingRes, dogsRes, careRes, postsRes] = await Promise.all([
        supabase.from("user_follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
        supabase.from("user_follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
        supabase.from("dogs").select("id, name, breed, photo_url").eq("owner_id", userId),
        supabase.from("care_requests").select("id", { count: "exact", head: true }).eq("owner_id", userId),
        supabase.from("posts").select("id, user_id, caption, photo_url, photo_urls, repost_id, created_at, visibility")
          .eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      ]);

      setFollowersCount(followersRes.count || 0);
      setFollowingCount(followingRes.count || 0);
      setUserDogs((dogsRes.data || []) as UserDog[]);
      setCareJobCount(careRes.count || 0);

      const postsData = postsRes.data;
      if (!postsData || postsData.length === 0) {
        setPosts([]);
        return;
      }

      const { data: allProfiles } = await supabase.rpc("get_public_profiles");
      const profileMap = new Map((allProfiles || []).map((p: any) => [p.user_id, p]));

      const repostIds = postsData.filter(p => p.repost_id).map(p => p.repost_id!);
      let originalPostsMap = new Map<string, any>();
      if (repostIds.length > 0) {
        const { data: originals } = await supabase
          .from("posts")
          .select("id, user_id, caption, photo_url, photo_urls, created_at")
          .in("id", repostIds);
        if (originals) originals.forEach(p => originalPostsMap.set(p.id, p));
      }

      const postIds = postsData.map(p => p.id);
      const { data: userLikes } = user
        ? await supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds)
        : { data: [] };
      const likedSet = new Set((userLikes || []).map(l => l.post_id));

      const { data: likeCounts } = await supabase.from("post_likes").select("post_id").in("post_id", postIds);
      const likeCountMap = new Map<string, number>();
      (likeCounts || []).forEach(l => likeCountMap.set(l.post_id, (likeCountMap.get(l.post_id) || 0) + 1));

      const { data: commentCounts } = await supabase.from("post_comments").select("post_id").in("post_id", postIds);
      const commentCountMap = new Map<string, number>();
      (commentCounts || []).forEach(c => commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) || 0) + 1));

      const enriched: PostData[] = postsData.map(p => {
        const original = p.repost_id ? originalPostsMap.get(p.repost_id) : null;
        return {
          ...p,
          author: profileMap.get(p.user_id) || undefined,
          like_count: likeCountMap.get(p.id) || 0,
          comment_count: commentCountMap.get(p.id) || 0,
          repost_count: 0,
          is_liked: likedSet.has(p.id),
          original_post: original ? {
            ...original,
            author: profileMap.get(original.user_id) || undefined,
            like_count: 0, comment_count: 0, repost_count: 0, is_liked: false,
          } : null,
        };
      });

      setPosts(enriched);
    } catch (err) {
      console.error("Error fetching user profile:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const toggleLike = async (postId: string, liked: boolean) => {
    if (!user) return;
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, is_liked: liked, like_count: p.like_count + (liked ? 1 : -1) } : p
    ));
    if (liked) {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
    } else {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    }
  };

  const repost = async (originalPostId: string) => {
    if (!user) return;
    await supabase.from("posts").insert({ user_id: user.id, repost_id: originalPostId });
    fetchProfile();
  };

  const deletePost = async (postId: string) => {
    await supabase.from("posts").delete().eq("id", postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MobileLayout>
    );
  }

  if (!profile) {
    return (
      <MobileLayout>
        <div className="p-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <EmptyState icon={<div />} title="User not found" description="" />
        </div>
      </MobileLayout>
    );
  }

  const displayUsername = profile.username || profile.display_name || "User";
  const displayName = profile.display_name || "";
  const initials = (profile.username || profile.display_name || "U")[0].toUpperCase();
  const isOwnProfile = user?.id === profile.user_id;

  return (
    <MobileLayout>
      <PageHeader
        title={profile.username ? `@${profile.username}` : displayName}
        showBack
      />

      <div className="p-4 space-y-4">
        {/* Profile Header Card */}
        <AnimatedItem>
          <GlassCard variant="light" className="overflow-hidden">
            <div className="p-5">
              {/* Avatar + Info row */}
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20 border-2 border-border">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                    <User className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 pt-1">
                  <h2 className="text-xl font-bold text-foreground truncate">{displayUsername}</h2>
                  {displayName && displayName !== displayUsername && (
                    <p className="text-sm text-muted-foreground">{displayName}</p>
                  )}
                  {profile.bio && (
                    <p className="text-xs text-muted-foreground mt-0.5">{profile.bio}</p>
                  )}
                  <div className="flex items-center gap-0 text-xs text-muted-foreground mt-0.5">
                    <span><span className="font-semibold text-foreground">{followersCount}</span> Followers</span>
                    <span className="mx-1">·</span>
                    <span><span className="font-semibold text-foreground">{followingCount}</span> Following</span>
                  </div>
                  {!isOwnProfile && (
                    <div className="mt-1.5">
                      <FollowButton targetUserId={profile.user_id} size="sm" />
                    </div>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center mt-4 border-t border-b border-border/50 py-3">
                <div className="flex-1 text-center">
                  <p className="text-lg font-bold text-foreground">{posts.length}</p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
                <div className="w-px h-8 bg-border/50" />
                <div className="flex-1 text-center">
                  <p className="text-lg font-bold text-foreground">{userDogs.length}</p>
                  <p className="text-xs text-muted-foreground">Pets</p>
                </div>
                <div className="w-px h-8 bg-border/50" />
                <div className="flex-1 text-center">
                  <p className="text-lg font-bold text-foreground">{careJobCount}</p>
                  <p className="text-xs text-muted-foreground">Care Jobs</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </AnimatedItem>

        {/* Dogs Section */}
        {userDogs.length > 0 && (
          <AnimatedItem delay={0.1}>
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Their Dogs
              </h2>
              <div className="space-y-2">
                {userDogs.map(dog => (
                  <div
                    key={dog.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/50 cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => navigate(`/dog/${dog.id}`)}
                  >
                    <div className="h-12 w-12 rounded-xl overflow-hidden bg-muted flex items-center justify-center shrink-0">
                      {dog.photo_url ? (
                        <img src={dog.photo_url} alt={dog.name} className="h-full w-full object-cover" />
                      ) : (
                        <Dog className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm">{dog.name}</h3>
                      {dog.breed && <p className="text-xs text-muted-foreground">{dog.breed}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </AnimatedItem>
        )}

        {/* Posts */}
        <AnimatedItem delay={0.2}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("feed.posts", "Posts")}
          </h3>
          {posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLikeToggle={(id, liked) => toggleLike(id, liked)}
                  onRepost={(id) => repost(post.repost_id || id)}
                  onDelete={(id) => deletePost(id)}
                  onShare={() => {}}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<div />}
              title={t("feed.noPosts", "No posts yet")}
              description=""
            />
          )}
        </AnimatedItem>
      </div>
    </MobileLayout>
  );
}
