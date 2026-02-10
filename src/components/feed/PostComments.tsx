import { useState, useEffect } from "react";
import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Comment {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  author?: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

export default function PostComments({ postId }: { postId: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from("post_comments")
      .select("id, text, created_at, user_id")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (!data) return;

    // Fetch author profiles
    const userIds = [...new Set(data.map((c) => c.user_id))];
    const { data: profiles } = await supabase.rpc("get_public_profiles");

    const profileMap = new Map(
      (profiles || []).map((p: any) => [p.user_id, p])
    );

    setComments(
      data.map((c) => ({
        ...c,
        author: profileMap.get(c.user_id) || null,
      }))
    );
  };

  const handleSend = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: user.id,
      text: text.trim(),
    });
    if (error) {
      toast.error("Failed to comment");
    } else {
      setText("");
      fetchComments();
    }
    setSending(false);
  };

  return (
    <div className="border-t border-border/30 px-4 py-3 space-y-3">
      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-2.5 max-h-60 overflow-y-auto">
          {comments.map((c) => {
            const name = c.author?.first_name
              ? `${c.author.first_name} ${c.author.last_name || ""}`.trim()
              : c.author?.display_name || "User";
            return (
              <div key={c.id} className="flex gap-2">
                <Avatar className="h-7 w-7 shrink-0">
                  {c.author?.avatar_url && <AvatarImage src={c.author.avatar_url} />}
                  <AvatarFallback className="text-[10px] bg-muted">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs">
                    <span className="font-semibold text-foreground">{name}</span>{" "}
                    <span className="text-foreground/80">{c.text}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("home.writeCaption")}
          className="flex-1 h-9 rounded-xl text-sm"
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
        />
        <Button
          size="icon"
          className="h-9 w-9 rounded-xl shrink-0"
          onClick={handleSend}
          disabled={!text.trim() || sending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
