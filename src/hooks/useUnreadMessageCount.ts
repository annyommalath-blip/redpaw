import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useUnreadMessageCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        // Get all conversations the user is part of
        const { data: conversations, error: convError } = await supabase
          .from("conversations")
          .select("id, updated_at")
          .contains("participant_ids", [user.id]);

        if (convError) throw convError;
        if (!conversations || conversations.length === 0) {
          setUnreadCount(0);
          return;
        }

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

        // Count conversations with unread messages
        let count = 0;
        for (const convo of conversations) {
          const lastRead = readMap.get(convo.id);
          const updatedAt = new Date(convo.updated_at);
          
          // If never read or updated after last read, it's unread
          if (!lastRead || updatedAt > lastRead) {
            count++;
          }
        }

        setUnreadCount(count);
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    };

    fetchUnreadCount();

    // Subscribe to conversation updates
    const channel = supabase
      .channel('unread-count-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          fetchUnreadCount();
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
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return unreadCount;
}
