import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Bot, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConversationItem } from "@/components/messages/ConversationItem";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { GuestAuthPrompt } from "@/components/auth/GuestAuthPrompt";

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
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<ConversationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { getUnreadCount } = useUnreadMessages();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    if (isGuest) {
      setShowAuthPrompt(true);
      setLoading(false);
    }
  }, [isGuest]);

  useEffect(() => {
    if (user) {
      fetchConversations();
      
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
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
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

      const otherParticipantIds = convos
        .flatMap(c => c.participant_ids.filter(id => id !== user.id))
        .filter((id, index, arr) => arr.indexOf(id) === index);

      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", otherParticipantIds);

      const conversationsWithProfiles: ConversationWithProfile[] = convos.map(convo => {
        const otherParticipantId = convo.participant_ids.find(id => id !== user.id);
        const profile = profiles?.find(p => p.user_id === otherParticipantId);
        
        return {
          ...convo,
          otherParticipantName: profile?.username ? `@${profile.username}` : profile?.display_name || "User",
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

  const handleOpenAIChat = () => {
    navigate("/messages/ai");
  };

  if (isGuest) {
    return (
      <MobileLayout>
        <PageHeader title={t("messages.title")} subtitle={t("messages.subtitle")} />
        <GuestAuthPrompt open={showAuthPrompt} onOpenChange={(open) => {
          setShowAuthPrompt(open);
          if (!open) navigate(-1);
        }} />
        <EmptyState
          icon={<MessageCircle className="h-8 w-8" />}
          title="Sign in to message"
          description="Create an account to chat with other dog parents"
        />
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <PageHeader title={t("messages.title")} subtitle={t("messages.subtitle")} />

      {loading ? (
        <div className="p-4 space-y-4">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* AI Assistant Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <GlassCard
              hover
              animate={false}
              className="overflow-hidden"
              onClick={handleOpenAIChat}
            >
              <div className="flex items-center gap-4 p-4">
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Bot className="h-7 w-7 text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center"
                    style={{ boxShadow: '0 4px 12px -2px hsl(0 78% 52% / 0.3)' }}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{t("messages.aiAssistant")}</span>
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">AI</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t("messages.askMeAnything")}
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Conversations List */}
          {conversations.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <GlassCard variant="light" className="overflow-hidden divide-y divide-border/50" animate={false}>
                {conversations.map((conversation) => {
                  const unreadCount = getUnreadCount(conversation.id);
                  return (
                    <ConversationItem
                      key={conversation.id}
                      id={conversation.id}
                      participantName={conversation.otherParticipantName}
                      participantAvatar={conversation.otherParticipantAvatar || ""}
                      lastMessage={conversation.last_message || t("messages.noMessagesYet")}
                      updatedAt={new Date(conversation.updated_at)}
                      unread={unreadCount > 0}
                      unreadCount={unreadCount}
                      onClick={() => handleOpenConversation(conversation.id)}
                    />
                  );
                })}
              </GlassCard>
            </motion.div>
          ) : (
            <EmptyState
              icon={<MessageCircle className="h-10 w-10 text-muted-foreground" />}
              title={t("messages.noConversations")}
              description={t("messages.conversationsAppearHere")}
            />
          )}
        </div>
      )}
    </MobileLayout>
  );
}
