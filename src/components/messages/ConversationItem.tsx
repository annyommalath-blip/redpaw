import { formatDistanceToNow } from "date-fns";
import { User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ConversationItemProps {
  id: string;
  participantName: string;
  participantAvatar?: string;
  lastMessage: string;
  updatedAt: Date;
  unread?: boolean;
  unreadCount?: number;
  onClick: () => void;
}

export function ConversationItem({
  participantName,
  participantAvatar,
  lastMessage,
  updatedAt,
  unread = false,
  unreadCount = 0,
  onClick,
}: ConversationItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors text-left border-b border-border"
    >
      {/* Avatar */}
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
        {participantAvatar ? (
          <img src={participantAvatar} alt={participantName} className="h-full w-full object-cover" />
        ) : (
          <User className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`font-medium text-foreground truncate ${unread ? "font-bold" : ""}`}>
            {participantName}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatDistanceToNow(updatedAt, { addSuffix: true })}
          </span>
        </div>
        <p className={`text-sm truncate ${unread ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
          {lastMessage}
        </p>
      </div>

      {/* Unread count badge */}
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="h-6 min-w-6 flex items-center justify-center p-0 px-1.5 text-xs shrink-0"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </button>
  );
}
