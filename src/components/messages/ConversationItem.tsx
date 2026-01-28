import { formatDistanceToNow } from "date-fns";
import { User } from "lucide-react";

interface ConversationItemProps {
  id: string;
  participantName: string;
  participantAvatar?: string;
  lastMessage: string;
  updatedAt: Date;
  unread?: boolean;
  onClick: () => void;
}

export function ConversationItem({
  participantName,
  participantAvatar,
  lastMessage,
  updatedAt,
  unread = false,
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
        <p className={`text-sm truncate ${unread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
          {lastMessage}
        </p>
      </div>

      {/* Unread indicator */}
      {unread && (
        <div className="h-3 w-3 rounded-full bg-primary shrink-0" />
      )}
    </button>
  );
}
