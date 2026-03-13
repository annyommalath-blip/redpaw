import { useState } from "react";
import { format } from "date-fns";
import { Languages, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SharedPostCard, parseSharedPost } from "./SharedPostCard";
import { ChatImageViewer } from "./ChatImageViewer";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";

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
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const { currentLanguage } = useLanguage();
  const { toast } = useToast();

  const handleTranslate = async () => {
    if (translatedText) {
      setTranslatedText(null);
      return;
    }
    if (!message || sharedPost) return;

    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate-message", {
        body: { text: message, targetLanguage: currentLanguage },
      });
      if (error) throw error;
      setTranslatedText(data.translatedText);
    } catch {
      toast({ variant: "destructive", title: "Translation failed" });
    } finally {
      setIsTranslating(false);
    }
  };

  const displayText = translatedText || message;
  const showTranslateButton = !sharedPost && message && !(imageUrl && message === "📷 Photo");

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
            {displayText && !(imageUrl && message === "📷 Photo") && (
              <p className="text-sm leading-relaxed px-4 py-2.5">
                {displayText}
                {translatedText && (
                  <span className="block text-[10px] opacity-60 mt-1 italic">Translated</span>
                )}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5 px-3">
          <span className="text-[10px] text-muted-foreground">
            {format(timestamp, "h:mm a")}
          </span>
          {showTranslateButton && (
            <button
              onClick={handleTranslate}
              disabled={isTranslating}
              className={cn(
                "text-muted-foreground hover:text-foreground transition-colors",
                translatedText && "text-primary"
              )}
            >
              {isTranslating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Languages className="h-3 w-3" />
              )}
            </button>
          )}
        </div>
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
