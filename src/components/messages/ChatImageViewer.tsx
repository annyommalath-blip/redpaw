import { useState } from "react";
import { X, Download, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

interface ChatImageViewerProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onReply?: () => void;
  senderName?: string;
}

export function ChatImageViewer({ imageUrl, isOpen, onClose, onReply, senderName }: ChatImageViewerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [zoomed, setZoomed] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `photo-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: t("common.success"), description: "Photo saved" });
    } catch {
      toast({ variant: "destructive", title: t("common.error"), description: "Failed to save photo" });
    }
  };

  const handleReply = () => {
    onClose();
    onReply?.();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 safe-area-top">
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
          <X className="h-6 w-6" />
        </Button>
        {senderName && (
          <span className="text-white/80 text-sm font-medium">{senderName}</span>
        )}
        <div className="w-11" />
      </div>

      {/* Image */}
      <div
        className="flex-1 flex items-center justify-center overflow-auto p-4"
        onClick={() => setZoomed(!zoomed)}
      >
        <img
          src={imageUrl}
          alt="Full size"
          className={`transition-transform duration-300 ${
            zoomed ? "max-w-none scale-150" : "max-w-full max-h-full object-contain"
          }`}
        />
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-center gap-6 px-4 py-4 safe-area-bottom">
        {onReply && (
          <button
            onClick={handleReply}
            className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
          >
            <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5" />
            </div>
            <span className="text-[11px]">{t("common.reply")}</span>
          </button>
        )}
        <button
          onClick={handleSave}
          className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
        >
          <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
            <Download className="h-5 w-5" />
          </div>
          <span className="text-[11px]">{t("common.save")}</span>
        </button>
      </div>
    </div>
  );
}
