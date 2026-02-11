import { useNavigate } from "react-router-dom";
import { ImageIcon, Images } from "lucide-react";
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
        "w-full rounded-lg overflow-hidden text-left transition-all active:scale-[0.97]",
        isOwn
          ? "border border-primary-foreground/15 bg-primary-foreground/10"
          : "border border-border bg-card"
      )}
    >
      {/* Author header - Instagram style */}
      {data.authorName && (
        <div className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 border-b",
          isOwn ? "border-primary-foreground/10" : "border-border/50"
        )}>
          <div className={cn(
            "h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0",
            isOwn ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            {data.authorName.replace("@", "").slice(0, 1).toUpperCase()}
          </div>
          <span className={cn(
            "text-[11px] font-semibold truncate",
            isOwn ? "text-primary-foreground" : "text-foreground"
          )}>
            {data.authorName}
          </span>
        </div>
      )}

      {/* Photo - original 4:5 aspect ratio, compact */}
      {data.photoUrl ? (
        <div className="relative w-full aspect-[4/5] bg-muted overflow-hidden">
          <img
            src={data.photoUrl}
            alt="Shared post"
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {(data.photoCount || 0) > 1 && (
            <span className="absolute top-1.5 right-1.5 bg-black/60 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <Images className="h-2.5 w-2.5" />
              {data.photoCount}
            </span>
          )}
        </div>
      ) : (
        <div className={cn(
          "w-full aspect-square flex items-center justify-center",
          isOwn ? "bg-primary-foreground/5" : "bg-muted/30"
        )}>
          <ImageIcon className={cn(
            "h-8 w-8",
            isOwn ? "text-primary-foreground/30" : "text-muted-foreground/30"
          )} />
        </div>
      )}

      {/* Caption footer */}
      {data.caption && (
        <div className={cn(
          "px-2.5 py-2",
          isOwn ? "border-t border-primary-foreground/10" : ""
        )}>
          <p className={cn(
            "text-[12px] line-clamp-2 leading-tight",
            isOwn ? "text-primary-foreground/90" : "text-foreground/80"
          )}>
            {data.authorName && (
              <span className="font-semibold mr-1">{data.authorName}</span>
            )}
            {data.caption}
          </p>
        </div>
      )}
    </button>
  );
}
