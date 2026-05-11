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

    // Capture the user id at call time so a mid-flight auth transition
    // doesn't apply stale results or surface a noisy "Load failed" error.
    const requestUserId = user.id;

    try {
      // Get all conversations the user is part of
      const { data: conversations, error: convError } = await supabase
        .from("conversations")
        .select("id")
        .contains("participant_ids", [requestUserId]);

      if (convError) throw convError;
      if (!conversations || conversations.length === 0) {
        setUnreadData({ totalUnread: 0, perConversation: new Map() });
        return;
      }

      const conversationIds = conversations.map(c => c.id);

      const { data: readStatuses, error: readError } = await supabase
        .from("conversation_reads")
        .select("conversation_id, last_read_at")
        .eq("user_id", requestUserId);

      if (readError) throw readError;

      const readMap = new Map(
        (readStatuses || []).map(r => [r.conversation_id, new Date(r.last_read_at)])
      );

      const { data: messages, error: msgError } = await supabase
        .from("messages")
        .select("id, conversation_id, created_at")
        .in("conversation_id", conversationIds)
        .neq("sender_id", requestUserId)
        .order("created_at", { ascending: false });

      if (msgError) throw msgError;

      const perConversation = new Map<string, number>();
      let totalUnread = 0;

      for (const msg of messages || []) {
        const lastRead = readMap.get(msg.conversation_id);
        const msgCreatedAt = new Date(msg.created_at);
        if (!lastRead || msgCreatedAt > lastRead) {
          const currentCount = perConversation.get(msg.conversation_id) || 0;
          perConversation.set(msg.conversation_id, currentCount + 1);
          totalUnread++;
        }
      }

      setUnreadData({ totalUnread, perConversation });
    } catch (error: any) {
      // Silently swallow transient network/auth-transition errors.
      // These typically appear as "Load failed" / "Failed to fetch" when
      // the auth token rotates mid-request and resolve on the next tick
      // via the realtime subscription or the next auth state change.
      const msg = String(error?.message || error || "");
      const isTransient =
        msg.includes("Load failed") ||
        msg.includes("Failed to fetch") ||
        msg.includes("NetworkError") ||
        msg.includes("AbortError");
      if (!isTransient) {
        console.error("Error fetching unread counts:", error);
      }
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
