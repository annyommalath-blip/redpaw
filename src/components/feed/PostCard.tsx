import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Send, Repeat2, MoreHorizontal, Trash2, Globe, Users, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FollowButton } from "@/components/social/FollowButton";
import { motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import PostComments from "./PostComments";
import PostPhotoCarousel from "./PostPhotoCarousel";

interface PostAuthor {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

export type PostVisibility = "public" | "friends" | "private";

export interface PostData {
  id: string;
  user_id: string;
  caption: string | null;
  photo_url: string | null;
  photo_urls?: string[] | null;
  repost_id: string | null;
  created_at: string;
  visibility?: PostVisibility;
  author?: PostAuthor;
  like_count: number;
  comment_count: number;
  repost_count: number;
  is_liked: boolean;
  original_post?: PostData | null;
}

interface PostCardProps {
  post: PostData;
  onLikeToggle: (postId: string, liked: boolean) => void;
  onRepost: (postId: string) => void;
  onDelete: (postId: string) => void;
  onShare: (post: PostData) => void;
}

export default function PostCard({ post, onLikeToggle, onRepost, onDelete, onShare }: PostCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);

  const displayPost = post.original_post || post;
  const isRepost = !!post.repost_id && !!post.original_post;
  const isOwn = post.user_id === user?.id;

  const authorName = displayPost.author
    ? displayPost.author.first_name
      ? `${displayPost.author.first_name} ${displayPost.author.last_name || ""}`.trim()
      : displayPost.author.display_name || "User"
    : "User";

  const repostAuthorName = isRepost && post.author
    ? post.author.first_name
      ? `${post.author.first_name} ${post.author.last_name || ""}`.trim()
      : post.author.display_name || "User"
    : "";

  const initials = authorName.slice(0, 2).toUpperCase();

  // Get photos array - prefer photo_urls, fallback to photo_url
  const photos = (() => {
    const urls = displayPost.photo_urls;
    if (urls && urls.length > 0) return urls;
    if (displayPost.photo_url) return [displayPost.photo_url];
    return [];
  })();

  const handleLike = () => {
    setLikeAnimating(true);
    onLikeToggle(post.id, !post.is_liked);
    setTimeout(() => setLikeAnimating(false), 300);
  };

  return (
    <GlassCard variant="light" className="overflow-hidden">
      {/* Repost header */}
      {isRepost && (
        <div className="px-4 pt-3 pb-1 flex items-center gap-2 text-xs text-muted-foreground">
          <Repeat2 className="h-3.5 w-3.5" />
          <span>{repostAuthorName} reposted</span>
        </div>
      )}

      {/* Author row */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <Avatar className="h-10 w-10">
          {displayPost.author?.avatar_url && <AvatarImage src={displayPost.author.avatar_url} />}
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground leading-tight">{authorName}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>{formatDistanceToNow(new Date(displayPost.created_at), { addSuffix: true })}</span>
            {isOwn && post.visibility && post.visibility !== "public" && (
              post.visibility === "friends"
                ? <Users className="h-3 w-3" />
                : <Lock className="h-3 w-3" />
            )}
          </div>
        </div>
        {!isOwn && displayPost.author && (
          <FollowButton targetUserId={displayPost.author.user_id} />
        )}
        {isOwn && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(post.id)}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Caption */}
      {displayPost.caption && (
        <p className="px-4 pb-2 text-sm text-foreground whitespace-pre-line">{displayPost.caption}</p>
      )}

      {/* Photos - carousel or single */}
      {photos.length > 0 && (
        <PostPhotoCarousel photos={photos} />
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/30">
        <div className="flex items-center gap-5">
          <button onClick={handleLike} className="flex items-center gap-1.5 group">
            <motion.div animate={likeAnimating ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.3 }}>
              <Heart
                className={cn(
                  "h-5 w-5 transition-colors",
                  post.is_liked ? "fill-red-500 text-red-500" : "text-muted-foreground group-hover:text-red-400"
                )}
              />
            </motion.div>
            {post.like_count > 0 && (
              <span className={cn("text-xs", post.is_liked ? "text-red-500" : "text-muted-foreground")}>
                {post.like_count}
              </span>
            )}
          </button>

          <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 group">
            <MessageCircle className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            {post.comment_count > 0 && (
              <span className="text-xs text-muted-foreground">{post.comment_count}</span>
            )}
          </button>

          <button onClick={() => onRepost(post.repost_id || post.id)} className="flex items-center gap-1.5 group">
            <Repeat2 className="h-5 w-5 text-muted-foreground group-hover:text-green-500 transition-colors" />
            {post.repost_count > 0 && (
              <span className="text-xs text-muted-foreground">{post.repost_count}</span>
            )}
          </button>

          <button onClick={() => onShare(post)} className="group">
            <Send className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        </div>
      </div>

      {/* Comments section */}
      {showComments && <PostComments postId={post.id} />}
    </GlassCard>
  );
}
