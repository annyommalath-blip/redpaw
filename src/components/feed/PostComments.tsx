import { useState, useEffect } from "react";
import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import MentionInput, { parseMentions, type MentionUser } from "./MentionInput";

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

function renderCommentText(text: string) {
  // Highlight @mentions in the text
  const parts = text.split(/(@[\w\s]+?)(?=\s@|\s|$)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="text-primary font-semibold">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function PostComments({ postId }: { postId: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [allUsers, setAllUsers] = useState<MentionUser[]>([]);

  useEffect(() => {
    fetchComments();
    supabase.rpc("get_public_profiles").then(({ data }) => {
      if (data) setAllUsers(data as MentionUser[]);
    });
  }, [postId]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from("post_comments")
      .select("id, text, created_at, user_id")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (!data) return;

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

    const commentText = text.trim();
    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: user.id,
      text: commentText,
    });

    if (error) {
      toast.error("Failed to comment");
    } else {
      // Send mention notifications via secure RPC
      const mentionedIds = parseMentions(commentText, allUsers);
      for (const mentionedUserId of mentionedIds) {
        await supabase.rpc("create_mention_notification" as any, {
          p_mentioned_user_id: mentionedUserId,
          p_comment_text: commentText,
          p_post_id: postId,
        });
      }
      setText("");
      fetchComments();
    }
    setSending(false);
  };

  return (
    <div className="border-t border-border/30 px-4 py-3 space-y-3">
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
                    <span className="text-foreground/80">{renderCommentText(c.text)}</span>
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

      <div className="flex gap-2">
        <MentionInput
          value={text}
          onChange={setText}
          placeholder={t("home.writeCaption")}
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
