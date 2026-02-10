import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Profile {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface SendPostSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postCaption: string | null;
  postPhotoUrl: string | null;
}

export default function SendPostSheet({ open, onOpenChange, postCaption, postPhotoUrl }: SendPostSheetProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchProfiles();
    }
  }, [open]);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data } = await supabase.rpc("get_public_profiles");
    setProfiles((data || []).filter((p: Profile) => p.user_id !== user?.id));
    setLoading(false);
  };

  const getName = (p: Profile) =>
    p.first_name ? `${p.first_name} ${p.last_name || ""}`.trim() : p.display_name || "User";

  const filtered = profiles.filter((p) => {
    if (!search.trim()) return true;
    const name = getName(p).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const handleSend = async (recipient: Profile) => {
    if (!user || sending) return;
    setSending(recipient.user_id);

    try {
      // Get or create conversation
      const { data: conversationId, error: convError } = await supabase.rpc("get_or_create_conversation", {
        p_user_id_1: user.id,
        p_user_id_2: recipient.user_id,
      });

      if (convError || !conversationId) throw convError || new Error("No conversation");

      // Build message text
      let messageText = "📤 Shared a post";
      if (postCaption) {
        messageText += `:\n"${postCaption.slice(0, 200)}${postCaption.length > 200 ? "..." : ""}"`;
      }
      if (postPhotoUrl) {
        messageText += `\n📷 ${postPhotoUrl}`;
      }

      // Send message
      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        text: messageText,
      });

      if (msgError) throw msgError;

      // Update conversation last_message
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Send to
          </SheetTitle>
        </SheetHeader>

        <div className="mt-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("common.search")}
              className="pl-9 rounded-xl h-9"
            />
          </div>

          <div className="max-h-[45vh] overflow-y-auto space-y-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t("common.noResults")}</p>
            ) : (
              filtered.map((p) => {
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
                    <span className="text-sm font-medium text-foreground flex-1 text-left">{name}</span>
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
