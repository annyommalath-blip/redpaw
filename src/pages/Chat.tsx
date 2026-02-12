import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Send, ArrowLeft, Loader2, ImagePlus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatBubble } from "@/components/messages/ChatBubble";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { processImageFile } from "@/lib/imageUtils";

interface Message {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
  image_url?: string | null;
}

interface Conversation {
  id: string;
  participant_ids: string[];
  context_type: string | null;
  context_id: string | null;
}

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [otherParticipantName, setOtherParticipantName] = useState(t("common.loading"));
  const [contextLabel, setContextLabel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (conversationId && user) {
      fetchConversation();
      fetchMessages();
      markAsRead();

      const channel = supabase
        .channel(`messages-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            markAsRead();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId, user]);

  const markAsRead = async () => {
    if (!conversationId || !user) return;
    try {
      await supabase
        .from("conversation_reads")
        .upsert(
          {
            conversation_id: conversationId,
            user_id: user.id,
            last_read_at: new Date().toISOString(),
          },
          { onConflict: "conversation_id,user_id" }
        );
    } catch (error) {
      console.error("Error marking conversation as read:", error);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchConversation = async () => {
    if (!conversationId) return;

    try {
      const { data: convo, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .maybeSingle();

      if (error) throw error;
      if (!convo) {
        toast({ variant: "destructive", title: t("messages.conversationNotFound") });
        navigate("/messages");
        return;
      }

      setConversation(convo);

      const otherParticipantId = convo.participant_ids.find((id: string) => id !== user?.id);
      if (otherParticipantId) {
        const { data: profile } = await supabase
          .from("profiles_public")
          .select("display_name, avatar_url, username")
          .eq("user_id", otherParticipantId)
          .maybeSingle();

        setOtherParticipantName(profile?.username ? `@${profile.username}` : profile?.display_name || t("messages.user"));
      }

      if (convo.context_type === "careRequest" && convo.context_id) {
        const { data: careRequest } = await supabase
          .from("care_requests")
          .select("care_type, dogs(name)")
          .eq("id", convo.context_id)
          .maybeSingle();

        if (careRequest) {
          const dogName = (careRequest.dogs as any)?.name || "Dog";
          setContextLabel(`Re: ${careRequest.care_type} for ${dogName}`);
        }
      }
    } catch (error: any) {
      console.error("Error fetching conversation:", error);
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const fetchMessages = async () => {
    if (!conversationId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const processed = await processImageFile(file);
      setSelectedImage(processed);
      setImagePreview(URL.createObjectURL(processed));
    } catch (err) {
      console.error("Error processing image:", err);
      toast({ variant: "destructive", title: t("common.error"), description: "Failed to process image" });
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("chat-images")
      .upload(path, file, { contentType: file.type });

    if (error) {
      console.error("Upload error:", error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from("chat-images")
      .getPublicUrl(path);

    return urlData.publicUrl;
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedImage) || !user || !conversationId || sending) return;

    const messageText = newMessage.trim();
    const imageFile = selectedImage;
    setNewMessage("");
    clearImage();
    setSending(true);

    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const { error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          text: messageText || (imageUrl ? "📷 Photo" : ""),
          image_url: imageUrl,
        });

      if (messageError) throw messageError;

      const lastMsg = messageText || "📷 Photo";
      const { error: convoError } = await supabase
        .from("conversations")
        .update({
          last_message: lastMsg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      if (convoError) throw convoError;
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({ variant: "destructive", title: t("messages.failedToSend"), description: error.message });
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/messages")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-foreground">{otherParticipantName}</h1>
            {contextLabel && (
              <p className="text-xs text-muted-foreground">{contextLabel}</p>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t("messages.sendFirstMessage")}
          </div>
        ) : (
          messages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message.text}
              timestamp={new Date(message.created_at)}
              isOwn={message.sender_id === user?.id}
              senderName={message.sender_id !== user?.id ? otherParticipantName : undefined}
              imageUrl={message.image_url}
            />
          ))
        )}
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="border-t border-border bg-card px-4 py-2">
          <div className="relative inline-block">
            <img src={imagePreview} alt="Preview" className="h-20 w-20 object-cover rounded-xl" />
            <button
              onClick={clearImage}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border bg-card p-4 safe-area-bottom">
        <div className="flex gap-2">
          <input
            type="file"
            accept="image/*,.heic,.heif"
            ref={fileInputRef}
            onChange={handleImageSelect}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className="shrink-0"
          >
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Input
            placeholder={t("messages.typeMessage")}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            disabled={sending}
          />
          <Button onClick={handleSend} disabled={(!newMessage.trim() && !selectedImage) || sending}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
