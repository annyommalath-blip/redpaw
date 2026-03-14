import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SharedPostCard, parseSharedPost } from "./SharedPostCard";
import { ChatImageViewer } from "./ChatImageViewer";

interface ChatBubbleProps {
  message: string;
  timestamp: Date;
  isOwn: boolean;
  senderName?: string;
  imageUrl?: string | null;
  onReplyToImage?: () => void;
}

export function ChatBubble({ message, timestamp, isOwn, senderName, imageUrl, onReplyToImage }: ChatBubbleProps) {
  const sharedPost = parseSharedPost(message);
  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <>
      <div className={cn(
        "flex flex-col gap-1 animate-fade-in",
        (sharedPost || imageUrl) ? "max-w-[65%]" : "max-w-[80%]",
        isOwn ? "ml-auto items-end" : "mr-auto items-start"
      )}>
        {!isOwn && senderName && (
          <span className="text-xs text-muted-foreground px-3 font-medium">{senderName}</span>
        )}

        {sharedPost ? (
          <div className={cn(
            "rounded-2xl overflow-hidden shadow-sm w-full",
            isOwn
              ? "bg-gradient-to-br from-primary to-primary-glow rounded-br-sm"
              : "glass-card-light rounded-bl-sm"
          )}>
            <div className="p-1">
              <SharedPostCard data={sharedPost} isOwn={isOwn} />
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "rounded-2xl shadow-sm overflow-hidden",
              isOwn
                ? "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground rounded-br-md"
                : "glass-card-light rounded-bl-md"
            )}
          >
            {imageUrl && (
              <button
                onClick={() => setViewerOpen(true)}
                className="block w-full"
              >
                <img
                  src={imageUrl}
                  alt="Shared image"
                  className="w-full aspect-[4/5] object-cover"
                />
              </button>
            )}
            {message && !(imageUrl && message === "📷 Photo") && (
              <p className="text-sm leading-relaxed px-4 py-2.5">{message}</p>
            )}
          </div>
        )}

        <span className="text-[10px] text-muted-foreground px-3">
          {format(timestamp, "h:mm a")}
        </span>
      </div>

      {imageUrl && (
        <ChatImageViewer
          imageUrl={imageUrl}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          onReply={onReplyToImage}
          senderName={isOwn ? undefined : senderName}
        />
      )}
    </>
  );
}
