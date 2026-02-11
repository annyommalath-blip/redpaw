import { formatDistanceToNow } from "date-fns";
import { User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDateLocale } from "@/hooks/useDateLocale";
import { cn } from "@/lib/utils";

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
  const dateLocale = useDateLocale();
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-4 transition-all duration-200 text-left",
        "hover:bg-accent/50 active:scale-[0.99]",
        "border-b border-border/50",
        unread && "bg-primary/5"
      )}
    >
      {/* Avatar */}
      <div className="relative">
        <div className="h-12 w-12 min-w-[3rem] min-h-[3rem] rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
          {participantAvatar ? (
            <img src={participantAvatar} alt={participantName} className="h-12 w-12 min-w-[3rem] min-h-[3rem] object-cover" />
          ) : (
            <User className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        {unread && (
          <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary border-2 border-card" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            "font-medium text-foreground truncate",
            unread && "font-bold"
          )}>
            {participantName}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0 uppercase tracking-wide">
            {formatDistanceToNow(updatedAt, { addSuffix: false, locale: dateLocale })}
          </span>
        </div>
        <p className={cn(
          "text-sm truncate mt-0.5",
          unread ? "text-foreground font-medium" : "text-muted-foreground"
        )}>
          {lastMessage}
        </p>
      </div>

      {/* Unread count badge */}
      {unreadCount > 0 && (
        <Badge 
          variant="default" 
          className="h-6 min-w-6 flex items-center justify-center p-0 px-2 text-xs shrink-0 rounded-full"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </button>
  );
}
