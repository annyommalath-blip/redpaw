import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Reply {
  id: string;
  post_id: string;
  user_id: string;
  text: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

interface FoundDogRepliesProps {
  postId: string;
  autoFocus?: boolean;
}

export function FoundDogReplies({ postId, autoFocus = false }: FoundDogRepliesProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReply, setNewReply] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReplies();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`found_dog_replies_${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'found_dog_replies',
          filter: `post_id=eq.${postId}`,
        },
        () => {
          fetchReplies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Small delay to ensure the component is rendered
      setTimeout(() => {
        inputRef.current?.focus();
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [autoFocus]);

  const fetchReplies = async () => {
    try {
      const { data, error } = await supabase
        .from("found_dog_replies")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch profiles for all unique user_ids
      const userIds = [...new Set(data?.map(r => r.user_id) || [])];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles_public")
          .select("user_id, display_name, first_name, last_name, avatar_url")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        const repliesWithProfiles = (data || []).map(reply => ({
          ...reply,
          profile: profileMap.get(reply.user_id) || null,
        }));

        setReplies(repliesWithProfiles);
      } else {
        setReplies([]);
      }
    } catch (error) {
      console.error("Error fetching replies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Please log in",
        description: "You need to be logged in to reply.",
      });
      return;
    }

    if (!newReply.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from("found_dog_replies")
        .insert({
          post_id: postId,
          user_id: user.id,
          text: newReply.trim(),
        });

      if (error) throw error;

      setNewReply("");
      toast({
        title: "Reply posted",
        description: "Your reply has been added.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not post reply",
      });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (replyId: string) => {
    try {
      const { error } = await supabase
        .from("found_dog_replies")
        .delete()
        .eq("id", replyId);

      if (error) throw error;

      toast({
        title: "Reply deleted",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not delete reply",
      });
    }
  };

  const getDisplayName = (profile: Reply["profile"]) => {
    if (!profile) return "Anonymous";
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    }
    return profile.display_name || "Anonymous";
  };

  return (
    <div ref={containerRef} className="space-y-4">
      <h3 className="font-semibold text-lg">Replies ({replies.length})</h3>

      {/* Replies List */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : replies.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No replies yet. Be the first to comment!
          </p>
        ) : (
          replies.map((reply) => (
            <div key={reply.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={reply.profile?.avatar_url || undefined} />
                <AvatarFallback>
                  {getDisplayName(reply.profile)[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {getDisplayName(reply.profile)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                  </span>
                  {user?.id === reply.user_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 ml-auto text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(reply.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-sm mt-1 break-words">{reply.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reply Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          ref={inputRef}
          placeholder="Write a reply..."
          value={newReply}
          onChange={(e) => setNewReply(e.target.value)}
          disabled={sending || !user}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={sending || !newReply.trim() || !user}>
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
      
      {!user && (
        <p className="text-xs text-muted-foreground text-center">
          Please log in to reply
        </p>
      )}
    </div>
  );
}
