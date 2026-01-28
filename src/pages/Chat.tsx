import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Send, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatBubble } from "@/components/messages/ChatBubble";

// Mock data
const mockMessages = [
  {
    id: "1",
    senderId: "other",
    text: "Hi! I think I saw your dog near Central Park!",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: "2",
    senderId: "me",
    text: "Oh really?! Where exactly?",
    timestamp: new Date(Date.now() - 1000 * 60 * 28),
  },
  {
    id: "3",
    senderId: "other",
    text: "Near the 72nd street entrance. He was with an older gentleman who seemed to be looking for the owner.",
    timestamp: new Date(Date.now() - 1000 * 60 * 25),
  },
  {
    id: "4",
    senderId: "me",
    text: "Thank you so much! I'm heading there now!",
    timestamp: new Date(Date.now() - 1000 * 60 * 20),
  },
];

export default function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState(mockMessages);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now().toString(),
      senderId: "me",
      text: newMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, message]);
    setNewMessage("");
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
            <h1 className="font-semibold text-foreground">Sarah Johnson</h1>
            <p className="text-xs text-muted-foreground">Re: Lost Dog Alert</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message.text}
            timestamp={message.timestamp}
            isOwn={message.senderId === "me"}
            senderName={message.senderId !== "me" ? "Sarah" : undefined}
          />
        ))}
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
          />
          <Button onClick={handleSend} disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
