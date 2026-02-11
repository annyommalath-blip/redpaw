import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PostCard from "@/components/feed/PostCard";
import { toast } from "sonner";

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchPost = async () => {
    if (!postId) return;
    setLoading(true);
    const { data } = await supabase
      .from("posts")
      .select("*, profiles:user_id(user_id, display_name, avatar_url, username)")
      .eq("id", postId)
      .maybeSingle();

    if (data) {
      const [likesRes, commentsRes, repostsRes, likedRes, repostedRes, savedRes] = await Promise.all([
        supabase.from("post_likes").select("id", { count: "exact", head: true }).eq("post_id", postId),
        supabase.from("post_comments").select("id", { count: "exact", head: true }).eq("post_id", postId),
        supabase.from("reposts").select("id", { count: "exact", head: true }).eq("post_id", postId),
        user ? supabase.from("post_likes").select("id").eq("post_id", postId).eq("user_id", user.id).maybeSingle() : { data: null },
        user ? supabase.from("reposts").select("id").eq("post_id", postId).eq("user_id", user.id).maybeSingle() : { data: null },
        user ? supabase.from("saved_posts").select("id").eq("post_id", postId).eq("user_id", user.id).maybeSingle() : { data: null },
      ]);

      setPost({
        ...data,
        author: data.profiles,
        likes_count: likesRes.count || 0,
        comments_count: commentsRes.count || 0,
        reposts_count: repostsRes.count || 0,
        is_liked: !!likedRes.data,
        is_reposted: !!repostedRes.data,
        is_saved: !!savedRes.data,
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchPost(); }, [postId, user]);

  const handleLikeToggle = async (id: string, liked: boolean) => {
    if (!user) return;
    if (liked) {
      await supabase.from("post_likes").delete().eq("post_id", id).eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: id, user_id: user.id });
    }
    fetchPost();
  };

  const handleRepost = async (id: string, reposted: boolean) => {
    if (!user) return;
    if (reposted) {
      await supabase.from("reposts").delete().eq("post_id", id).eq("user_id", user.id);
    } else {
      await supabase.from("reposts").insert({ post_id: id, user_id: user.id });
    }
    fetchPost();
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-foreground">Post</h1>
        </div>
      </header>

      <div className="flex-1 p-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : post ? (
          <PostCard
            post={post}
            onLikeToggle={handleLikeToggle}
            onRepost={handleRepost}
            onDelete={() => { toast.success("Post deleted"); navigate(-1); }}
            onShare={() => {}}
          />
        ) : (
          <p className="text-center text-muted-foreground py-16">Post not found</p>
        )}
      </div>
    </div>
  );
}
