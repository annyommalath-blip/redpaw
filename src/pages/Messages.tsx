import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConversationItem } from "@/components/messages/ConversationItem";
import { EmptyState } from "@/components/ui/empty-state";

// Mock data until database is set up
const mockConversations = [
  {
    id: "1",
    participantName: "Sarah Johnson",
    participantAvatar: "",
    lastMessage: "I think I saw your dog near the park!",
    updatedAt: new Date(Date.now() - 1000 * 60 * 5),
    unread: true,
  },
  {
    id: "2",
    participantName: "Mike Davis",
    participantAvatar: "",
    lastMessage: "I can walk Charlie tomorrow afternoon",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    unread: false,
  },
  {
    id: "3",
    participantName: "Emily Chen",
    participantAvatar: "",
    lastMessage: "Thanks for watching Luna! She had a great time.",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    unread: false,
  },
];

export default function MessagesPage() {
  const [conversations] = useState(mockConversations);
  const navigate = useNavigate();

  const handleOpenConversation = (conversationId: string) => {
    navigate(`/messages/${conversationId}`);
  };

  return (
    <MobileLayout>
      <PageHeader title="Messages" subtitle="Your conversations" />

      <div className="flex flex-col">
        {conversations.length > 0 ? (
          conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              id={conversation.id}
              participantName={conversation.participantName}
              participantAvatar={conversation.participantAvatar}
              lastMessage={conversation.lastMessage}
              updatedAt={conversation.updatedAt}
              unread={conversation.unread}
              onClick={() => handleOpenConversation(conversation.id)}
            />
          ))
        ) : (
          <EmptyState
            icon={<MessageCircle className="h-10 w-10 text-muted-foreground" />}
            title="No messages yet"
            description="When you respond to care requests or lost dog alerts, your conversations will appear here."
          />
        )}
      </div>
    </MobileLayout>
  );
}
