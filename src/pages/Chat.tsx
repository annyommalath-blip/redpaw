import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Send, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatBubble } from "@/components/messages/ChatBubble";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
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
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [otherParticipantName, setOtherParticipantName] = useState("Loading...");
  const [contextLabel, setContextLabel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationId && user) {
      fetchConversation();
      fetchMessages();

      // Subscribe to new messages
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
              // Avoid duplicates
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId, user]);

  useEffect(() => {
    // Scroll to bottom when messages change
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
        toast({ variant: "destructive", title: "Conversation not found" });
        navigate("/messages");
        return;
      }

      setConversation(convo);

      // Fetch other participant's profile
      const otherParticipantId = convo.participant_ids.find((id: string) => id !== user?.id);
      if (otherParticipantId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, first_name, last_name")
          .eq("user_id", otherParticipantId)
          .maybeSingle();

        const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
        setOtherParticipantName(fullName || profile?.display_name || "User");
      }

      // Fetch context label if care request
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

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !conversationId || sending) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      // Insert message
      const { error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          text: messageText,
        });

      if (messageError) throw messageError;

      // Update conversation's last_message and updated_at
      const { error: convoError } = await supabase
        .from("conversations")
        .update({
          last_message: messageText,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      if (convoError) throw convoError;
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({ variant: "destructive", title: "Failed to send", description: error.message });
      setNewMessage(messageText); // Restore message on error
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
            No messages yet. Send the first message!
          </div>
        ) : (
          messages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message.text}
              timestamp={new Date(message.created_at)}
              isOwn={message.sender_id === user?.id}
              senderName={message.sender_id !== user?.id ? otherParticipantName : undefined}
            />
          ))
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card p-4 safe-area-bottom">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            disabled={sending}
          />
          <Button onClick={handleSend} disabled={!newMessage.trim() || sending}>
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
