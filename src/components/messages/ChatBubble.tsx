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
    <div className={cn("flex flex-col gap-1 max-w-[80%]", isOwn ? "ml-auto items-end" : "mr-auto items-start")}>
      {!isOwn && senderName && (
        <span className="text-xs text-muted-foreground px-2">{senderName}</span>
      )}
      <div
        className={cn(
          "px-4 py-2 rounded-2xl",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        <p className="text-sm">{message}</p>
      </div>
      <span className="text-xs text-muted-foreground px-2">
        {format(timestamp, "h:mm a")}
      </span>
    </div>
  );
}
