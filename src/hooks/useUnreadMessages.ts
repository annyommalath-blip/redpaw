import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UnreadData {
  totalUnread: number;
  perConversation: Map<string, number>;
}

export function useUnreadMessages() {
  const { user } = useAuth();
  const [unreadData, setUnreadData] = useState<UnreadData>({
    totalUnread: 0,
    perConversation: new Map(),
  });

  const fetchUnreadCounts = useCallback(async () => {
    if (!user) {
      setUnreadData({ totalUnread: 0, perConversation: new Map() });
      return;
    }

    try {
      // Get all conversations the user is part of
      const { data: conversations, error: convError } = await supabase
        .from("conversations")
        .select("id")
        .contains("participant_ids", [user.id]);

      if (convError) throw convError;
      if (!conversations || conversations.length === 0) {
        setUnreadData({ totalUnread: 0, perConversation: new Map() });
        return;
      }

      const conversationIds = conversations.map(c => c.id);

      // Get user's read status for each conversation
      const { data: readStatuses, error: readError } = await supabase
        .from("conversation_reads")
        .select("conversation_id, last_read_at")
        .eq("user_id", user.id);

      if (readError) throw readError;

      // Create a map of conversation_id -> last_read_at
      const readMap = new Map(
        (readStatuses || []).map(r => [r.conversation_id, new Date(r.last_read_at)])
      );

      // Get all messages in user's conversations that are NOT sent by the user
      const { data: messages, error: msgError } = await supabase
        .from("messages")
        .select("id, conversation_id, created_at")
        .in("conversation_id", conversationIds)
        .neq("sender_id", user.id)
        .order("created_at", { ascending: false });

      if (msgError) throw msgError;

      // Count unread messages per conversation
      const perConversation = new Map<string, number>();
      let totalUnread = 0;

      for (const msg of messages || []) {
        const lastRead = readMap.get(msg.conversation_id);
        const msgCreatedAt = new Date(msg.created_at);

        // If never read or message is newer than last read, it's unread
        if (!lastRead || msgCreatedAt > lastRead) {
          const currentCount = perConversation.get(msg.conversation_id) || 0;
          perConversation.set(msg.conversation_id, currentCount + 1);
          totalUnread++;
        }
      }

      setUnreadData({ totalUnread, perConversation });
    } catch (error) {
      console.error("Error fetching unread counts:", error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadData({ totalUnread: 0, perConversation: new Map() });
      return;
    }

    fetchUnreadCounts();

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('unread-messages-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchUnreadCounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_reads',
        },
        () => {
          fetchUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [user, fetchUnreadCounts]);

  return {
    totalUnread: unreadData.totalUnread,
    getUnreadCount: (conversationId: string) => unreadData.perConversation.get(conversationId) || 0,
    refetch: fetchUnreadCounts,
  };
}
