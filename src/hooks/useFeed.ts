import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { PostData } from "@/components/feed/PostCard";

type FeedItem = {
  post: {
    id: string;
    user_id: string;
    caption: string | null;
    photo_url: string | null;
    photo_urls?: string[] | null;
    created_at: string;
    visibility?: PostData["visibility"];
  };
  repost_by?: string;
  repost_created_at?: string;
  sort_time: string;
};

type InteractionPost = {
  id: string;
  user_id: string;
  caption: string | null;
  photo_url: string | null;
  photo_urls?: string[] | null;
};

type UserTasteProfile = {
  preferredAuthors: Map<string, number>;
  preferredTokens: Map<string, number>;
  prefersPhotos: boolean;
  prefersMultiPhoto: boolean;
};

const STOP_WORDS = new Set([
  "the", "and", "for", "you", "your", "with", "this", "that", "have", "from",
  "are", "was", "were", "been", "they", "them", "their", "our", "out", "but",
  "not", "all", "too", "very", "just", "into", "over", "under", "after", "before",
  "when", "what", "where", "here", "there", "how", "why", "who", "his", "her",
  "its", "our", "dog", "dogs", "pet", "pets",
]);

const tokenizeCaption = (caption: string | null | undefined): string[] => {
  if (!caption) return [];

  return caption
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
};

const getPhotoCount = (post: { photo_url: string | null; photo_urls?: string[] | null }) => {
  if (post.photo_urls?.length) return post.photo_urls.length;
  return post.photo_url ? 1 : 0;
};

const getRecencyScore = (timestamp: string) => {
  const ageHours = Math.max(0, (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60));
  return Math.exp(-ageHours / 36);
};

const getEngagementScore = (post: PostData) => {
  const weightedEngagement =
    post.like_count * 1 +
    post.comment_count * 3 +
    post.repost_count * 2 +
    (post.is_saved ? 2 : 0);

  return Math.log1p(weightedEngagement) / Math.log(20);
};

const buildUserTasteProfile = (interactionPosts: InteractionPost[]): UserTasteProfile => {
  const preferredAuthors = new Map<string, number>();
  const preferredTokens = new Map<string, number>();
  let photoHeavyInteractions = 0;
  let multiPhotoInteractions = 0;

  interactionPosts.forEach((post) => {
    preferredAuthors.set(post.user_id, (preferredAuthors.get(post.user_id) || 0) + 1);

    tokenizeCaption(post.caption).forEach((token) => {
      preferredTokens.set(token, (preferredTokens.get(token) || 0) + 1);
    });

    const photoCount = getPhotoCount(post);
    if (photoCount > 0) photoHeavyInteractions += 1;
    if (photoCount > 1) multiPhotoInteractions += 1;
  });

  const interactionCount = interactionPosts.length || 1;

  return {
    preferredAuthors,
    preferredTokens,
    prefersPhotos: photoHeavyInteractions / interactionCount >= 0.5,
    prefersMultiPhoto: multiPhotoInteractions / interactionCount >= 0.3,
  };
};

const getPreferenceScore = (
  item: FeedItem,
  userTasteProfile: UserTasteProfile | null,
  followingIds: string[],
) => {
  const contentAuthorId = item.post.user_id;
  const distributorId = item.repost_by || item.post.user_id;
  let score = 0;

  if (followingIds.includes(contentAuthorId)) score += 0.55;
  if (distributorId !== contentAuthorId && followingIds.includes(distributorId)) score += 0.25;

  if (!userTasteProfile) return score;

  score += Math.min(0.7, (userTasteProfile.preferredAuthors.get(contentAuthorId) || 0) * 0.18);

  const tokens = tokenizeCaption(item.post.caption);
  const tokenAffinity = tokens.reduce(
    (sum, token) => sum + (userTasteProfile.preferredTokens.get(token) || 0),
    0,
  );
  score += Math.min(0.8, tokenAffinity * 0.08);

  const photoCount = getPhotoCount(item.post);
  if (userTasteProfile.prefersPhotos && photoCount > 0) score += 0.2;
  if (userTasteProfile.prefersMultiPhoto && photoCount > 1) score += 0.15;

  return score;
};

const getContentQualityScore = (post: FeedItem["post"]) => {
  const photoCount = getPhotoCount(post);
  const captionLength = post.caption?.trim().length || 0;
  let score = 0;

  if (photoCount > 0) score += 0.6;
  if (photoCount > 1) score += 0.2;
  if (captionLength >= 20) score += 0.1;
  if (captionLength >= 80) score += 0.1;

  return score;
};

const diversifyByAuthor = (posts: Array<PostData & { ranking_score: number }>) => {
  const remaining = [...posts].sort((a, b) => b.ranking_score - a.ranking_score);
  const authorOccurrences = new Map<string, number>();
  const diversified: Array<PostData & { ranking_score: number }> = [];

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const authorId = candidate.original_post?.user_id || candidate.user_id;
      const seenCount = authorOccurrences.get(authorId) || 0;
      const diversifiedScore = candidate.ranking_score - seenCount * 0.12;

      if (diversifiedScore > bestScore) {
        bestScore = diversifiedScore;
        bestIndex = index;
      }
    }

    const [selected] = remaining.splice(bestIndex, 1);
    const authorId = selected.original_post?.user_id || selected.user_id;
    authorOccurrences.set(authorId, (authorOccurrences.get(authorId) || 0) + 1);
    diversified.push(selected);
  }

  return diversified;
};

export function useFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
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
      const followingIds: string[] = [];
      if (user) {
        const { data: followingData } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", user.id);
        followingIds.push(...(followingData || []).map((f) => f.following_id));
      }

      // Fetch reposts by followed users (and self) - skip for guests
      const repostUserIds = user ? [...followingIds, user.id] : [];
      let repostsData: any[] = [];
      if (repostUserIds.length > 0) {
        const { data } = await supabase
          .from("reposts")
          .select("user_id, post_id, created_at")
          .in("user_id", repostUserIds)
          .order("created_at", { ascending: false })
          .limit(50);
        repostsData = data || [];
      }

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

      // Fetch likes for current user (skip for guests)
      const likedSet = new Set<string>();
      if (user) {
        const { data: userLikes } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", allPostIds);
        (userLikes || []).forEach((l) => likedSet.add(l.post_id));
      }

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

      // Fetch saved status (skip for guests)
      const savedSet = new Set<string>();
      if (user) {
        const { data: userSaved } = await supabase
          .from("saved_posts")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", allPostIds);
        (userSaved || []).forEach((s) => savedSet.add(s.post_id));
      }

      // Check if current user has reposted each post (skip for guests)
      const repostedSet = new Set<string>();
      if (user) {
        const { data: userReposts } = await supabase
          .from("reposts")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", allPostIds);
        (userReposts || []).forEach((r) => repostedSet.add(r.post_id));
      }

      let userTasteProfile: UserTasteProfile | null = null;
      if (user) {
        const [{ data: likedHistory }, { data: savedHistory }, { data: repostHistory }] = await Promise.all([
          supabase.from("post_likes").select("post_id").eq("user_id", user.id).limit(40),
          supabase.from("saved_posts").select("post_id").eq("user_id", user.id).limit(30),
          supabase.from("reposts").select("post_id").eq("user_id", user.id).limit(20),
        ]);

        const interactionPostIds = [
          ...(likedHistory || []).map((item) => item.post_id),
          ...(savedHistory || []).map((item) => item.post_id),
          ...(repostHistory || []).map((item) => item.post_id),
        ];

        const uniqueInteractionPostIds = [...new Set(interactionPostIds)].filter(Boolean);
        if (uniqueInteractionPostIds.length > 0) {
          const { data: interactionPosts } = await supabase
            .from("posts")
            .select("id, user_id, caption, photo_url, photo_urls")
            .in("id", uniqueInteractionPostIds.slice(0, 50));

          if (interactionPosts?.length) {
            userTasteProfile = buildUserTasteProfile(interactionPosts);
          }
        }
      }

      // Build enriched posts
      const enrichedPosts: Array<PostData & { ranking_score: number }> = uniqueItems.map((item) => {
        const p = item.post;
        const basePost: PostData = {
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

        const recencyScore = getRecencyScore(item.sort_time);
        const engagementScore = getEngagementScore(basePost);
        const preferenceScore = getPreferenceScore(item, userTasteProfile, followingIds);
        const contentQualityScore = getContentQualityScore(item.post);
        const explorationScore = recencyScore > 0.8 && engagementScore < 0.35 ? 0.12 : 0;

        const rankingScore =
          recencyScore * 0.4 +
          engagementScore * 0.22 +
          preferenceScore * 0.23 +
          contentQualityScore * 0.1 +
          explorationScore +
          (item.repost_by ? 0.04 : 0);

        return {
          ...basePost,
          ranking_score: rankingScore,
        };
      });

      const rankedPosts = diversifyByAuthor(enrichedPosts);
      setPosts(rankedPosts);
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

  const updatePost = async (postId: string, caption: string, visibility: "public" | "friends" | "private") => {
    const { error } = await supabase
      .from("posts")
      .update({ caption, visibility })
      .eq("id", postId);
    if (error) throw error;
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, caption, visibility } : p))
    );
  };

  return { posts, loading, fetchPosts, toggleLike, repost, deletePost, updatePost };
}
