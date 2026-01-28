import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Loader2 } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConversationItem } from "@/components/messages/ConversationItem";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Conversation {
  id: string;
  participant_ids: string[];
  last_message: string | null;
  updated_at: string;
  context_type: string | null;
  context_id: string | null;
}

interface ConversationWithProfile extends Conversation {
  otherParticipantName: string;
  otherParticipantAvatar: string | null;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConversations();
      
      // Subscribe to conversation updates
      const channel = supabase
        .channel('conversations-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversations',
          },
          () => {
            fetchConversations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;
    
    try {
      // Fetch conversations where user is a participant
      const { data: convos, error } = await supabase
        .from("conversations")
        .select("*")
        .contains("participant_ids", [user.id])
        .order("updated_at", { ascending: false });

      if (error) throw error;
      if (!convos || convos.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get all other participant IDs
      const otherParticipantIds = convos
        .flatMap(c => c.participant_ids.filter(id => id !== user.id))
        .filter((id, index, arr) => arr.indexOf(id) === index);

      // Fetch profiles for other participants
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, first_name, last_name, avatar_url")
        .in("user_id", otherParticipantIds);

      // Combine conversations with profiles
      const conversationsWithProfiles: ConversationWithProfile[] = convos.map(convo => {
        const otherParticipantId = convo.participant_ids.find(id => id !== user.id);
        const profile = profiles?.find(p => p.user_id === otherParticipantId);
        const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
        
        return {
          ...convo,
          otherParticipantName: fullName || profile?.display_name || "User",
          otherParticipantAvatar: profile?.avatar_url || null,
        };
      });

      setConversations(conversationsWithProfiles);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConversation = (conversationId: string) => {
    navigate(`/messages/${conversationId}`);
  };

  return (
    <MobileLayout>
      <PageHeader title="Messages" subtitle="Your conversations" />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex flex-col">
          {conversations.length > 0 ? (
            conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                id={conversation.id}
                participantName={conversation.otherParticipantName}
                participantAvatar={conversation.otherParticipantAvatar || ""}
                lastMessage={conversation.last_message || "No messages yet"}
                updatedAt={new Date(conversation.updated_at)}
                unread={false}
                onClick={() => handleOpenConversation(conversation.id)}
              />
            ))
          ) : (
            <EmptyState
              icon={<MessageCircle className="h-10 w-10 text-muted-foreground" />}
              title="No messages yet"
              description="When you message about care requests or lost dog alerts, your conversations will appear here."
            />
          )}
        </div>
      )}
    </MobileLayout>
  );
}
