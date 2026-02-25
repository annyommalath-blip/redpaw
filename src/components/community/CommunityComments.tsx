import { useState, useEffect } from "react";
import { MessageCircle, Trash2, Send, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/ui/glass-card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface CommunityCommentsProps {
  contextType: "donation" | "adoption";
  contextId: string;
}

interface Comment {
  id: string;
  user_id: string;
  text: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

export function CommunityComments({ contextType, contextId }: CommunityCommentsProps) {
  const { user, isGuest } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, [contextId]);

  const fetchComments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("community_comments")
      .select("*")
      .eq("context_type", contextType)
      .eq("context_id", contextId)
      .order("created_at", { ascending: true });

    if (data) {
      // Fetch profiles for commenters
      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.rpc("get_public_profiles");
        if (profiles) {
          profiles.forEach((p: any) => {
            profilesMap[p.user_id] = p;
          });
        }
      }

      setComments(
        data.map((c: any) => ({
          ...c,
          profile: profilesMap[c.user_id] || null,
        }))
      );
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || !user || isGuest) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("community_comments").insert({
        user_id: user.id,
        context_type: contextType,
        context_id: contextId,
        text: newComment.trim(),
      });
      if (error) throw error;
      setNewComment("");
      fetchComments();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase.from("community_comments").delete().eq("id", commentId);
    if (!error) fetchComments();
  };

  const getDisplayName = (comment: Comment) => {
    return comment.profile?.display_name || comment.profile?.username || "Anonymous";
  };

  const getInitials = (comment: Comment) => {
    const name = getDisplayName(comment);
    return name.charAt(0).toUpperCase();
  };

  return (
    <GlassCard variant="light" className="p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <MessageCircle className="h-4 w-4" />
        Comments ({comments.length})
      </h3>

      {/* Comment list */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Be the first!</p>
      ) : (
        <div className="space-y-3 mb-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2.5">
              <Avatar
                className="h-8 w-8 shrink-0 cursor-pointer"
                onClick={() => comment.user_id && navigate(`/user/${comment.user_id}`)}
              >
                <AvatarImage src={comment.profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(comment)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-semibold cursor-pointer hover:underline"
                    onClick={() => comment.user_id && navigate(`/user/${comment.user_id}`)}
                  >
                    {getDisplayName(comment)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground">{comment.text}</p>
              </div>
              {user?.id === comment.user_id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => handleDelete(comment.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      {user && !isGuest ? (
        <div className="flex gap-2">
          <Input
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
            className="rounded-xl"
          />
          <Button
            size="icon"
            className="rounded-xl shrink-0"
            disabled={!newComment.trim() || submitting}
            onClick={handleSubmit}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center">Sign in to comment</p>
      )}
    </GlassCard>
  );
}
