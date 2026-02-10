import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FollowButton } from "@/components/social/FollowButton";
import PostCard from "@/components/feed/PostCard";
import type { PostData } from "@/components/feed/PostCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UserProfile {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      // Fetch profile
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("*")
        .eq("user_id", userId)
        .limit(1);

      if (profiles && profiles.length > 0) {
        setProfile(profiles[0] as UserProfile);
      }

      // Fetch follower/following counts
      const { count: followers } = await supabase
        .from("user_follows")
        .select("id", { count: "exact", head: true })
        .eq("following_id", userId);
      setFollowersCount(followers || 0);

      const { count: following } = await supabase
        .from("user_follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_id", userId);
      setFollowingCount(following || 0);

      // Fetch user's posts (only public ones visible to viewer)
      const { data: postsData } = await supabase
        .from("posts")
        .select("id, user_id, caption, photo_url, photo_urls, repost_id, created_at, visibility")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!postsData) {
        setPosts([]);
        return;
      }

      // Fetch profile map for authors
      const { data: allProfiles } = await supabase.rpc("get_public_profiles");
      const profileMap = new Map(
        (allProfiles || []).map((p: any) => [p.user_id, p])
      );

      // Repost originals
      const repostIds = postsData.filter(p => p.repost_id).map(p => p.repost_id!);
      let originalPostsMap = new Map<string, any>();
      if (repostIds.length > 0) {
        const { data: originals } = await supabase
          .from("posts")
          .select("id, user_id, caption, photo_url, photo_urls, created_at")
          .in("id", repostIds);
        if (originals) {
          originals.forEach(p => originalPostsMap.set(p.id, p));
        }
      }

      // Likes
      const postIds = postsData.map(p => p.id);
      const { data: userLikes } = user
        ? await supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds)
        : { data: [] };
      const likedSet = new Set((userLikes || []).map(l => l.post_id));

      const { data: likeCounts } = await supabase
        .from("post_likes").select("post_id").in("post_id", postIds);
      const likeCountMap = new Map<string, number>();
      (likeCounts || []).forEach(l => {
        likeCountMap.set(l.post_id, (likeCountMap.get(l.post_id) || 0) + 1);
      });

      // Comments
      const { data: commentCounts } = await supabase
        .from("post_comments").select("post_id").in("post_id", postIds);
      const commentCountMap = new Map<string, number>();
      (commentCounts || []).forEach(c => {
        commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) || 0) + 1);
      });

      // Reposts
      const { data: repostCounts } = await supabase
        .from("posts").select("repost_id").in("repost_id", postIds);
      const repostCountMap = new Map<string, number>();
      (repostCounts || []).forEach(r => {
        if (r.repost_id) repostCountMap.set(r.repost_id, (repostCountMap.get(r.repost_id) || 0) + 1);
      });

      const enriched: PostData[] = postsData.map(p => {
        const original = p.repost_id ? originalPostsMap.get(p.repost_id) : null;
        return {
          ...p,
          author: profileMap.get(p.user_id) || undefined,
          like_count: likeCountMap.get(p.id) || 0,
          comment_count: commentCountMap.get(p.id) || 0,
          repost_count: repostCountMap.get(p.id) || 0,
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
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, is_liked: liked, like_count: p.like_count + (liked ? 1 : -1) }
          : p
      )
    );
    if (liked) {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
    } else {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    }
  };

  const repost = async (originalPostId: string) => {
    if (!user) return;
    const { error } = await supabase.from("posts").insert({ user_id: user.id, repost_id: originalPostId });
    if (!error) fetchProfile();
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

  const name = profile.display_name || [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "User";
  const initials = (profile.first_name?.[0] || "") + (profile.last_name?.[0] || "") || name[0] || "?";
  const isOwnProfile = user?.id === profile.user_id;

  return (
    <MobileLayout>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b px-4 pt-4 pb-3 safe-area-top">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-lg truncate">{name}</h1>
        </div>
      </div>

      {/* Profile Card */}
      <div className="p-4">
        <div className="flex items-start gap-4 mb-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="bg-muted text-muted-foreground font-bold text-lg">
              {initials.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg">{name}</h2>
            {profile.bio && (
              <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span><strong>{followersCount}</strong> <span className="text-muted-foreground">followers</span></span>
              <span><strong>{followingCount}</strong> <span className="text-muted-foreground">following</span></span>
            </div>
          </div>
        </div>

        {!isOwnProfile && (
          <FollowButton targetUserId={profile.user_id} size="default" className="w-full mb-4" />
        )}

        {/* Posts */}
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
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
      </div>
    </MobileLayout>
  );
}
