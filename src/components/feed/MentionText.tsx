import { useEffect, useState, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { parseMentionParts } from "@/lib/mentionUtils";
import { supabase } from "@/integrations/supabase/client";

interface MentionTextProps {
  text: string;
  className?: string;
}

// Cache username -> userId mapping globally
const usernameCache = new Map<string, string | null>();

/**
 * Renders text with @username tokens as clickable mention links.
 */
const MentionText = forwardRef<HTMLSpanElement, MentionTextProps>(({ text, className }, ref) => {
  const navigate = useNavigate();
  const parts = parseMentionParts(text);
  const [resolvedMap, setResolvedMap] = useState<Map<string, string | null>>(new Map());

  // Resolve usernames to user IDs
  useEffect(() => {
    const mentionParts = parts.filter((p) => p.type === "mention");
    if (mentionParts.length === 0) return;

    const uncached = mentionParts.map((p) => p.value.toLowerCase()).filter((u) => !usernameCache.has(u));

    if (uncached.length === 0) {
      // Use cached values
      const cached = new Map<string, string | null>();
      mentionParts.forEach((p) => {
        const key = p.value.toLowerCase();
        if (usernameCache.has(key)) {
          cached.set(key, usernameCache.get(key)!);
        }
      });
      setResolvedMap(cached);
      return;
    }

    // Fetch all profiles once and match by username
    supabase.rpc("get_public_profiles").then(({ data }) => {
      const newMap = new Map<string, string | null>();
      const profiles = data || [];
      for (const username of uncached) {
        const profile = profiles.find((p: any) => p.username?.toLowerCase() === username);
        const userId = profile?.user_id || null;
        usernameCache.set(username, userId);
        newMap.set(username, userId);
      }
      // Include cached
      mentionParts.forEach((p) => {
        const key = p.value.toLowerCase();
        if (usernameCache.has(key) && !newMap.has(key)) {
          newMap.set(key, usernameCache.get(key)!);
        }
      });
      setResolvedMap(newMap);
    });
  }, [text]);

  return (
    <span ref={ref} className={className}>
      {parts.map((part, i) =>
        part.type === "mention" ? (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              const userId = resolvedMap.get(part.value.toLowerCase()) || usernameCache.get(part.value.toLowerCase());
              if (userId) navigate(`/user/${userId}`);
            }}
            className="text-primary font-semibold hover:underline"
          >
            @{part.value}
          </button>
        ) : (
          <span key={i}>{part.value}</span>
        )
      )}
    </span>
  );
});

MentionText.displayName = "MentionText";

export default MentionText;
