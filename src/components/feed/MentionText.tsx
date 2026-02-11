import { useEffect, useState } from "react";
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
export default function MentionText({ text, className }: MentionTextProps) {
  const navigate = useNavigate();
  const parts = parseMentionParts(text);
  const [resolvedMap, setResolvedMap] = useState<Map<string, string | null>>(new Map());

  // Resolve usernames to user IDs
  useEffect(() => {
    const usernames = parts
      .filter((p) => p.type === "mention")
      .map((p) => p.value)
      .filter((u) => !usernameCache.has(u));

    if (usernames.length === 0) {
      // Use cached values
      const cached = new Map<string, string | null>();
      parts.filter((p) => p.type === "mention").forEach((p) => {
        if (usernameCache.has(p.value)) {
          cached.set(p.value, usernameCache.get(p.value)!);
        }
      });
      setResolvedMap(cached);
      return;
    }

    // Fetch all profiles once and match by username
    supabase.rpc("get_public_profiles").then(({ data }) => {
      const newMap = new Map<string, string | null>();
      const profiles = data || [];
      for (const username of usernames) {
        const profile = profiles.find((p: any) => p.username === username);
        const userId = profile?.user_id || null;
        usernameCache.set(username, userId);
        newMap.set(username, userId);
      }
      // Include cached
      parts.filter((p) => p.type === "mention").forEach((p) => {
        if (usernameCache.has(p.value) && !newMap.has(p.value)) {
          newMap.set(p.value, usernameCache.get(p.value)!);
        }
      });
      setResolvedMap(newMap);
    });
  }, [text]);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.type === "mention" ? (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              const userId = resolvedMap.get(part.value) || usernameCache.get(part.value);
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
}
