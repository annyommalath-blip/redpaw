import { useState, useEffect } from "react";
import { Clock, Image as ImageIcon, Video, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { getSignedUrls } from "@/hooks/useSignedUrl";
import { useDateLocale } from "@/hooks/useDateLocale";
import { useTranslation } from "react-i18next";

type LogType = "walk" | "meal" | "potty" | "play" | "note";

interface SitterLogCardProps {
  logType: LogType;
  noteText?: string | null;
  mediaUrls: string[];
  createdAt: string;
  sitterName?: string;
}

const logTypeConfig: Record<LogType, { icon: string; label: string; color: string }> = {
  walk: { icon: "🚶", label: "Walk", color: "bg-success text-success-foreground" },
  meal: { icon: "🍖", label: "Meal", color: "bg-warning text-warning-foreground" },
  potty: { icon: "🚽", label: "Potty Break", color: "bg-accent text-accent-foreground" },
  play: { icon: "🎾", label: "Play Time", color: "bg-primary text-primary-foreground" },
  note: { icon: "📝", label: "Note", color: "bg-muted text-muted-foreground" },
};

export function SitterLogCard({
  logType,
  noteText,
  mediaUrls,
  createdAt,
  sitterName,
}: SitterLogCardProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const config = logTypeConfig[logType];
  const [signedUrls, setSignedUrls] = useState<(string | null)[]>([]);
  const [loading, setLoading] = useState(false);
  
  const getLogLabel = (type: LogType) => {
    const labels: Record<LogType, string> = {
      walk: t("sitterLog.walk"),
      meal: t("sitterLog.meal"),
      potty: t("sitterLog.potty"),
      play: t("sitterLog.play"),
      note: t("sitterLog.note"),
    };
    return labels[type];
  };

  useEffect(() => {
    if (mediaUrls.length === 0) {
      setSignedUrls([]);
      return;
    }

    const fetchUrls = async () => {
      setLoading(true);
      try {
        // Check if URLs are already signed/public (legacy data) or need signing
        const needsSigning = mediaUrls.some(url => !url.startsWith("http"));
        
        if (needsSigning) {
          const urls = await getSignedUrls("sitter-logs", mediaUrls, 3600);
          setSignedUrls(urls);
        } else {
          // Legacy public URLs - use as-is
          setSignedUrls(mediaUrls);
        }
      } catch (error) {
        console.error("Error fetching signed URLs:", error);
        setSignedUrls([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUrls();
  }, [mediaUrls]);

  return (
    <Card>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <Badge className={config.color}>
            {config.icon} {getLogLabel(logType)}
          </Badge>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: dateLocale })}
            </span>
            {sitterName && (
              <p className="text-xs text-muted-foreground">{t("sitterLog.by")} {sitterName}</p>
            )}
          </div>
        </div>

        {/* Note */}
        {noteText && (
          <p className="text-sm text-foreground mb-3">{noteText}</p>
        )}

        {/* Media Grid */}
        {mediaUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {loading ? (
              <div className="col-span-3 flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              signedUrls.map((url, index) => {
                if (!url) return null;
                
                const originalPath = mediaUrls[index] || "";
                const isVideo = originalPath.includes(".mp4") || originalPath.includes(".mov") || originalPath.includes(".webm") ||
                               url.includes(".mp4") || url.includes(".mov") || url.includes(".webm");
                
                return (
                  <div
                    key={index}
                    className="aspect-square rounded-lg overflow-hidden bg-muted relative"
                  >
                    {isVideo ? (
                      <>
                        <video
                          src={url}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Video className="h-6 w-6 text-white" />
                        </div>
                      </>
                    ) : (
                      <img
                        src={url}
                        alt={`Update ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
