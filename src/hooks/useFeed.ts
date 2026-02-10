import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { PostData } from "@/components/feed/PostCard";

export function useFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch posts
      const { data: postsData, error } = await supabase
        .from("posts")
        .select("id, user_id, caption, photo_url, photo_urls, repost_id, created_at, visibility")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error || !postsData) {
        console.error("Error fetching posts:", error);
        setLoading(false);
        return;
      }

      // Get all user IDs (post authors + repost originals)
      const repostIds = postsData.filter((p) => p.repost_id).map((p) => p.repost_id!);

      // Fetch original posts for reposts
      let originalPostsMap = new Map<string, any>();
      if (repostIds.length > 0) {
        const { data: originals } = await supabase
          .from("posts")
          .select("id, user_id, caption, photo_url, photo_urls, created_at")
          .in("id", repostIds);
        if (originals) {
          originals.forEach((p) => originalPostsMap.set(p.id, p));
        }
      }

      // Gather all user IDs
      const allUserIds = new Set<string>();
      postsData.forEach((p) => allUserIds.add(p.user_id));
      originalPostsMap.forEach((p) => allUserIds.add(p.user_id));

      // Fetch profiles
      const { data: profiles } = await supabase.rpc("get_public_profiles");
      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.user_id, p])
      );

      // Fetch likes for current user
      const postIds = postsData.map((p) => p.id);
      const { data: userLikes } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds);
      const likedSet = new Set((userLikes || []).map((l) => l.post_id));

      // Fetch like counts
      const { data: likeCounts } = await supabase
        .from("post_likes")
        .select("post_id")
        .in("post_id", postIds);
      const likeCountMap = new Map<string, number>();
      (likeCounts || []).forEach((l) => {
        likeCountMap.set(l.post_id, (likeCountMap.get(l.post_id) || 0) + 1);
      });

      // Fetch comment counts
      const { data: commentCounts } = await supabase
        .from("post_comments")
        .select("post_id")
        .in("post_id", postIds);
      const commentCountMap = new Map<string, number>();
      (commentCounts || []).forEach((c) => {
        commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) || 0) + 1);
      });

      // Fetch repost counts (how many times each post was reposted)
      const { data: repostCounts } = await supabase
        .from("posts")
        .select("repost_id")
        .in("repost_id", postIds);
      const repostCountMap = new Map<string, number>();
      (repostCounts || []).forEach((r) => {
        if (r.repost_id) {
          repostCountMap.set(r.repost_id, (repostCountMap.get(r.repost_id) || 0) + 1);
        }
      });

      // Build post data
      const enrichedPosts: PostData[] = postsData.map((p) => {
        const original = p.repost_id ? originalPostsMap.get(p.repost_id) : null;
        return {
          ...p,
          author: profileMap.get(p.user_id) || undefined,
          like_count: likeCountMap.get(p.id) || 0,
          comment_count: commentCountMap.get(p.id) || 0,
          repost_count: repostCountMap.get(p.id) || 0,
          is_liked: likedSet.has(p.id),
          original_post: original
            ? {
                ...original,
                author: profileMap.get(original.user_id) || undefined,
                like_count: 0,
                comment_count: 0,
                repost_count: 0,
                is_liked: false,
              }
            : null,
        };
      });

      setPosts(enrichedPosts);
    } catch (err) {
      console.error("Feed error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const toggleLike = async (postId: string, liked: boolean) => {
    if (!user) return;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
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
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      repost_id: originalPostId,
    });
    if (!error) {
      fetchPosts();
    }
  };

  const deletePost = async (postId: string) => {
    await supabase.from("posts").delete().eq("id", postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return { posts, loading, fetchPosts, toggleLike, repost, deletePost };
}
