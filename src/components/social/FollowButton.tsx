import { useState, useEffect } from "react";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  targetUserId: string;
  size?: "xs" | "sm";
  className?: string;
}

export function FollowButton({ targetUserId, size = "xs", className }: FollowButtonProps) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const isOwnUser = !user || user.id === targetUserId;

  useEffect(() => {
    if (isOwnUser) {
      setLoading(false);
      return;
    }
    checkFollowStatus();
  }, [user, targetUserId]);

  const checkFollowStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_follows" as any)
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId)
      .maybeSingle();
    setIsFollowing(!!data);
    setLoading(false);
  };

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || toggling) return;
    setToggling(true);

    try {
      if (isFollowing) {
        await supabase
          .from("user_follows" as any)
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);
        setIsFollowing(false);
      } else {
        await supabase
          .from("user_follows" as any)
          .insert({ follower_id: user.id, following_id: targetUserId } as any);
        setIsFollowing(true);
      }
    } catch (err) {
      console.error("Follow toggle error:", err);
    } finally {
      setToggling(false);
    }
  };

  if (loading || isOwnUser) return null;

  if (isFollowing) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        disabled={toggling}
        className={cn(
          "h-7 px-2 text-xs rounded-full text-muted-foreground hover:text-destructive gap-1",
          className
        )}
      >
        {toggling ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />}
        <span className="hidden sm:inline">Following</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={toggling}
      className={cn(
        "h-7 px-2 text-xs rounded-full text-primary hover:text-primary gap-1 font-semibold",
        className
      )}
    >
      {toggling ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
      Follow
    </Button>
  );
}
