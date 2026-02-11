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
      // Fetch original posts (non-reposts only)
      const { data: postsData, error } = await supabase
        .from("posts")
        .select("id, user_id, caption, photo_url, photo_urls, created_at, visibility")
        .is("repost_id", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error || !postsData) {
        console.error("Error fetching posts:", error);
        setLoading(false);
        return;
      }

      // Get users that current user follows
      const { data: followingData } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id);
      const followingIds = (followingData || []).map((f) => f.following_id);

      // Fetch reposts by followed users (and self)
      const repostUserIds = [...followingIds, user.id];
      const { data: repostsData } = await supabase
        .from("reposts")
        .select("user_id, post_id, created_at")
        .in("user_id", repostUserIds)
        .order("created_at", { ascending: false })
        .limit(50);

      // Get reposted post IDs that aren't already in the feed
      const existingPostIds = new Set(postsData.map((p) => p.id));
      const repostedPostIds = [...new Set((repostsData || []).map((r) => r.post_id))];
      const missingPostIds = repostedPostIds.filter((id) => !existingPostIds.has(id));

      // Fetch missing reposted posts
      let repostedPostsMap = new Map<string, any>();
      if (missingPostIds.length > 0) {
        const { data: repostedPosts } = await supabase
          .from("posts")
          .select("id, user_id, caption, photo_url, photo_urls, created_at, visibility")
          .in("id", missingPostIds);
        if (repostedPosts) {
          repostedPosts.forEach((p) => repostedPostsMap.set(p.id, p));
        }
      }
      // Also map existing posts for lookup
      postsData.forEach((p) => repostedPostsMap.set(p.id, p));

      // Fetch profiles
      const { data: profiles } = await supabase.rpc("get_public_profiles");
      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.user_id, p])
      );

      // Build a combined feed: original posts + repost entries
      // For reposts, use the repost's created_at as the sort time
      type FeedItem = {
        post: any;
        repost_by?: string;
        repost_created_at?: string;
        sort_time: string;
      };

      const feedItems: FeedItem[] = [];

      // Add original posts
      postsData.forEach((p) => {
        feedItems.push({ post: p, sort_time: p.created_at });
      });

      // Add reposts (deduplicate: only show latest repost per post)
      const seenRepostPosts = new Set<string>();
      (repostsData || []).forEach((r) => {
        if (seenRepostPosts.has(r.post_id)) return;
        // Don't add if the post author is the reposter (reposting own post)
        const postData = repostedPostsMap.get(r.post_id);
        if (!postData || postData.user_id === r.user_id) return;
        seenRepostPosts.add(r.post_id);
        feedItems.push({
          post: postData,
          repost_by: r.user_id,
          repost_created_at: r.created_at,
          sort_time: r.created_at,
        });
      });

      // Sort by sort_time descending
      feedItems.sort((a, b) => new Date(b.sort_time).getTime() - new Date(a.sort_time).getTime());

      // Deduplicate: if a post appears as both original and repost, keep the one that comes first
      const seenIds = new Set<string>();
      const uniqueItems = feedItems.filter((item) => {
        const key = item.repost_by ? `repost-${item.post.id}-${item.repost_by}` : item.post.id;
        if (seenIds.has(item.post.id)) return false;
        seenIds.add(item.post.id);
        return true;
      });

      // Collect all post IDs for counts
      const allPostIds = uniqueItems.map((item) => item.post.id);

      // Fetch likes for current user
      const { data: userLikes } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", allPostIds);
      const likedSet = new Set((userLikes || []).map((l) => l.post_id));

      // Fetch like counts
      const { data: likeCounts } = await supabase
        .from("post_likes")
        .select("post_id")
        .in("post_id", allPostIds);
      const likeCountMap = new Map<string, number>();
      (likeCounts || []).forEach((l) => {
        likeCountMap.set(l.post_id, (likeCountMap.get(l.post_id) || 0) + 1);
      });

      // Fetch comment counts
      const { data: commentCounts } = await supabase
        .from("post_comments")
        .select("post_id")
        .in("post_id", allPostIds);
      const commentCountMap = new Map<string, number>();
      (commentCounts || []).forEach((c) => {
        commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) || 0) + 1);
      });

      // Fetch repost counts from reposts table
      const { data: repostCountsData } = await supabase
        .from("reposts")
        .select("post_id")
        .in("post_id", allPostIds);
      const repostCountMap = new Map<string, number>();
      (repostCountsData || []).forEach((r) => {
        repostCountMap.set(r.post_id, (repostCountMap.get(r.post_id) || 0) + 1);
      });

      // Fetch saved status
      const { data: userSaved } = await supabase
        .from("saved_posts")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", allPostIds);
      const savedSet = new Set((userSaved || []).map((s) => s.post_id));

      // Check if current user has reposted each post
      const { data: userReposts } = await supabase
        .from("reposts")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", allPostIds);
      const repostedSet = new Set((userReposts || []).map((r) => r.post_id));

      // Build enriched posts
      const enrichedPosts: PostData[] = uniqueItems.map((item) => {
        const p = item.post;
        return {
          ...p,
          repost_id: item.repost_by ? "repost" : null, // marker for repost display
          author: profileMap.get(p.user_id) || undefined,
          like_count: likeCountMap.get(p.id) || 0,
          comment_count: commentCountMap.get(p.id) || 0,
          repost_count: repostCountMap.get(p.id) || 0,
          is_liked: likedSet.has(p.id),
          is_saved: savedSet.has(p.id),
          is_reposted: repostedSet.has(p.id),
          original_post: item.repost_by
            ? {
                ...p,
                author: profileMap.get(p.user_id) || undefined,
                like_count: 0,
                comment_count: 0,
                repost_count: 0,
                is_liked: false,
              }
            : null,
          // Override author to show the reposter for repost entries
          ...(item.repost_by
            ? {
                user_id: item.repost_by,
                author: profileMap.get(item.repost_by) || undefined,
                // Keep original post author in original_post
                original_post: {
                  ...p,
                  author: profileMap.get(p.user_id) || undefined,
                  like_count: likeCountMap.get(p.id) || 0,
                  comment_count: commentCountMap.get(p.id) || 0,
                  repost_count: repostCountMap.get(p.id) || 0,
                  is_liked: likedSet.has(p.id),
                },
              }
            : {}),
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
      prev.map((p) => {
        const targetId = p.original_post ? p.original_post.id : p.id;
        if (targetId === postId) {
          return { ...p, is_liked: liked, like_count: p.like_count + (liked ? 1 : -1) };
        }
        return p;
      })
    );

    if (liked) {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
    } else {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    }
  };

  const repost = async (originalPostId: string, reposted: boolean) => {
    if (!user) return;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        const targetId = p.original_post ? p.original_post.id : p.id;
        if (targetId === originalPostId) {
          return { ...p, is_reposted: reposted, repost_count: p.repost_count + (reposted ? 1 : -1) };
        }
        return p;
      })
    );

    if (reposted) {
      await supabase.from("reposts").insert({ user_id: user.id, post_id: originalPostId });
    } else {
      await supabase.from("reposts").delete().eq("user_id", user.id).eq("post_id", originalPostId);
    }
  };

  const deletePost = async (postId: string) => {
    await supabase.from("posts").delete().eq("id", postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return { posts, loading, fetchPosts, toggleLike, repost, deletePost };
}
