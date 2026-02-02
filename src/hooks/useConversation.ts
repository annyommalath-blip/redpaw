import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export function useConversation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  /**
   * Get or create a canonical conversation between the current user and another user.
   * Uses the database RPC to ensure only one conversation exists per user pair.
   * Returns the conversation ID.
   */
  const getOrCreateConversation = useCallback(
    async (
      otherUserId: string,
      contextType?: string,
      contextId?: string
    ): Promise<string | null> => {
      if (!user) {
        navigate("/auth");
        return null;
      }

      if (user.id === otherUserId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Cannot start a conversation with yourself",
        });
        return null;
      }

      try {
        const { data: conversationId, error } = await supabase.rpc(
          "get_or_create_conversation",
          {
            p_user_id_1: user.id,
            p_user_id_2: otherUserId,
            p_context_type: contextType || null,
            p_context_id: contextId || null,
          }
        );

        if (error) throw error;

        return conversationId;
      } catch (error: any) {
        console.error("Error getting/creating conversation:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not start conversation",
        });
        return null;
      }
    },
    [user, navigate, toast]
  );

  /**
   * Navigate to a conversation with another user, creating it if needed.
   */
  const openConversation = useCallback(
    async (
      otherUserId: string,
      contextType?: string,
      contextId?: string
    ): Promise<void> => {
      const conversationId = await getOrCreateConversation(
        otherUserId,
        contextType,
        contextId
      );

      if (conversationId) {
        navigate(`/messages/${conversationId}`);
      }
    },
    [getOrCreateConversation, navigate]
  );

  return {
    getOrCreateConversation,
    openConversation,
  };
}
