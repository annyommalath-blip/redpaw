import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Loader2, Search, Send, Copy, Share2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  score?: number;
}

interface SendPostSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId?: string;
  postCaption: string | null;
  postPhotoUrl: string | null;
  postPhotoUrls?: string[] | null;
}

export default function SendPostSheet({
  open,
  onOpenChange,
  postId,
  postCaption,
  postPhotoUrl,
  postPhotoUrls,
}: SendPostSheetProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!user) return;
      setLoading(true);
      const { data } = await supabase.rpc("get_share_suggestions", {
        p_user_id: user.id,
        p_query: query,
        p_limit: 20,
      });
      setProfiles((data as Profile[]) || []);
      setLoading(false);
    },
    [user]
  );

  useEffect(() => {
    if (open && user) {
      setSearch("");
      setCopied(false);
      fetchSuggestions("");
    }
  }, [open, user, fetchSuggestions]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      fetchSuggestions(search);
    }, 200);
    return () => clearTimeout(timer);
  }, [search, open, fetchSuggestions]);

  const getName = (p: Profile) =>
    p.username ? `@${p.username}` : p.display_name || "User";

  const handleSend = async (recipient: Profile) => {
    if (!user || sending) return;
    setSending(recipient.user_id);

    try {
      const { data: conversationId, error: convError } = await supabase.rpc(
        "get_or_create_conversation",
        {
          p_user_id_1: user.id,
          p_user_id_2: recipient.user_id,
        }
      );

      if (convError || !conversationId) throw convError || new Error("No conversation");

      let messageText = "📤 Shared a post";
      if (postCaption) {
        messageText += `:\n"${postCaption.slice(0, 200)}${postCaption.length > 200 ? "..." : ""}"`;
      }
      const photos = postPhotoUrls?.length ? postPhotoUrls : postPhotoUrl ? [postPhotoUrl] : [];
      if (photos.length > 0) {
        messageText += `\n📷 ${photos[0]}`;
        if (photos.length > 1) messageText += ` (+${photos.length - 1} more)`;
      }
      if (postId) {
        messageText += `\n🔗 /post/${postId}`;
      }

      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        text: messageText,
      });

      if (msgError) throw msgError;

      await supabase
        .from("conversations")
        .update({ last_message: messageText, updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      toast.success(`Sent to ${getName(recipient)}!`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to send");
      console.error(err);
    } finally {
      setSending(null);
    }
  };

  const handleCopyLink = async () => {
    const link = postId
      ? `${window.location.origin}/post/${postId}`
      : window.location.href;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleExternalShare = async () => {
    const link = postId
      ? `${window.location.origin}/post/${postId}`
      : window.location.href;
    const shareData: ShareData = {
      title: "Check this out on RedPaw!",
      text: postCaption?.slice(0, 100) || "Check out this post",
      url: link,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          toast.error("Share failed");
        }
      }
    } else {
      // Fallback to copy
      handleCopyLink();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[75vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Share
          </SheetTitle>
        </SheetHeader>

        <div className="mt-3 space-y-3">
          {/* Quick actions row */}
          <div className="flex gap-3">
            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors flex-1"
            >
              {copied ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <Copy className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="text-xs font-medium text-foreground">
                {copied ? "Copied!" : "Copy Link"}
              </span>
            </button>
            <button
              onClick={handleExternalShare}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors flex-1"
            >
              <Share2 className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">Share</span>
            </button>
          </div>

          <Separator />

          {/* Send to user */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Send to
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("common.search")}
              className="pl-9 rounded-xl h-9"
            />
          </div>

          <div className="max-h-[35vh] overflow-y-auto space-y-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : profiles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {search.trim()
                  ? t("common.noResults")
                  : "Follow or message people to see suggestions"}
              </p>
            ) : (
              profiles.map((p) => {
                const name = getName(p);
                const isSending = sending === p.user_id;
                return (
                  <button
                    key={p.user_id}
                    onClick={() => handleSend(p)}
                    disabled={!!sending}
                    className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-muted/50 transition-colors disabled:opacity-50"
                  >
                    <Avatar className="h-10 w-10">
                      {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <span className="text-sm font-medium text-foreground block truncate">
                        {name}
                      </span>
                      {p.username && p.display_name && (
                        <span className="text-xs text-muted-foreground block truncate">
                          {p.display_name}
                        </span>
                      )}
                    </div>
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Send className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
