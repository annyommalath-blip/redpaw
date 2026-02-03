import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  message: string;
  timestamp: Date;
  isOwn: boolean;
  senderName?: string;
}

export function ChatBubble({ message, timestamp, isOwn, senderName }: ChatBubbleProps) {
  return (
    <div className={cn(
      "flex flex-col gap-1 max-w-[80%] animate-fade-in",
      isOwn ? "ml-auto items-end" : "mr-auto items-start"
    )}>
      {!isOwn && senderName && (
        <span className="text-xs text-muted-foreground px-3 font-medium">{senderName}</span>
      )}
      <div
        className={cn(
          "px-4 py-2.5 rounded-2xl shadow-sm",
          isOwn
            ? "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground rounded-br-md"
            : "glass-card-light rounded-bl-md"
        )}
      >
        <p className="text-sm leading-relaxed">{message}</p>
      </div>
      <span className="text-[10px] text-muted-foreground px-3">
        {format(timestamp, "h:mm a")}
      </span>
    </div>
  );
}
