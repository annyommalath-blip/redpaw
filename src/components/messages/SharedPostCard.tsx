import { useNavigate } from "react-router-dom";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SharedPostData {
  postId: string;
  caption?: string;
  photoUrl?: string;
  photoCount?: number;
  authorName?: string;
}

/**
 * Try to parse a message as a shared post.
 * Returns SharedPostData if it's a shared post, null otherwise.
 */
export function parseSharedPost(text: string): SharedPostData | null {
  // New JSON format: {"type":"shared_post",...}
  if (text.startsWith('{"type":"shared_post"')) {
    try {
      const data = JSON.parse(text);
      if (data.type === "shared_post" && data.postId) {
        return {
          postId: data.postId,
          caption: data.caption || undefined,
          photoUrl: data.photoUrl || undefined,
          photoCount: data.photoCount || 0,
          authorName: data.authorName || undefined,
        };
      }
    } catch {
      // not valid JSON
    }
  }

  // Legacy format: "📤 Shared a post..."
  if (text.startsWith("📤 Shared a post")) {
    const linkMatch = text.match(/🔗\s*\/post\/([a-f0-9-]+)/);
    const captionMatch = text.match(/:\n"(.+?)"/s);
    const photoMatch = text.match(/📷\s*(https?:\/\/\S+)/);
    const moreMatch = text.match(/\(\+(\d+) more\)/);

    if (linkMatch) {
      return {
        postId: linkMatch[1],
        caption: captionMatch?.[1],
        photoUrl: photoMatch?.[1],
        photoCount: moreMatch ? parseInt(moreMatch[1]) + 1 : photoMatch ? 1 : 0,
      };
    }
  }

  return null;
}

interface SharedPostCardProps {
  data: SharedPostData;
  isOwn: boolean;
}

export function SharedPostCard({ data, isOwn }: SharedPostCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/post/${data.postId}`);
      }}
      className={cn(
        "w-full rounded-xl overflow-hidden border text-left transition-all active:scale-[0.98]",
        isOwn
          ? "border-primary-foreground/20 bg-primary-foreground/10"
          : "border-border bg-card"
      )}
    >
      {/* Photo preview */}
      {data.photoUrl ? (
        <div className="relative w-full aspect-[16/10] bg-muted overflow-hidden">
          <img
            src={data.photoUrl}
            alt="Shared post"
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {(data.photoCount || 0) > 1 && (
            <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <ImageIcon className="h-2.5 w-2.5" />
              {data.photoCount}
            </span>
          )}
        </div>
      ) : (
        <div className="w-full h-20 bg-muted/50 flex items-center justify-center">
          <ImageIcon className={cn(
            "h-6 w-6",
            isOwn ? "text-primary-foreground/40" : "text-muted-foreground/40"
          )} />
        </div>
      )}

      {/* Caption / info */}
      <div className="px-3 py-2.5">
        {data.authorName && (
          <p className={cn(
            "text-[11px] font-semibold mb-0.5",
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {data.authorName}
          </p>
        )}
        {data.caption ? (
          <p className={cn(
            "text-sm line-clamp-2 leading-snug",
            isOwn ? "text-primary-foreground" : "text-foreground"
          )}>
            {data.caption}
          </p>
        ) : (
          <p className={cn(
            "text-xs italic",
            isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
          )}>
            Shared a post
          </p>
        )}
        <p className={cn(
          "text-[10px] mt-1",
          isOwn ? "text-primary-foreground/50" : "text-muted-foreground/60"
        )}>
          Tap to view post
        </p>
      </div>
    </button>
  );
}
