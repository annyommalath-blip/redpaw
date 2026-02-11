import { useState, useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { buildMentionToken, extractMentionedUserIds } from "@/lib/mentionUtils";

export interface MentionUser {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/** Extract mentioned user IDs from structured mention tokens */
export function parseMentions(text: string): string[] {
  return extractMentionedUserIds(text);
}

function getName(u: MentionUser): string {
  if (u.first_name) return `${u.first_name} ${u.last_name || ""}`.trim();
  return u.display_name || "User";
}

export default function MentionInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled,
  className,
}: MentionInputProps) {
  const [allUsers, setAllUsers] = useState<MentionUser[]>([]);
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch all users once
  useEffect(() => {
    supabase.rpc("get_public_profiles").then(({ data }) => {
      if (data) setAllUsers(data as MentionUser[]);
    });
  }, []);

  const checkForMention = useCallback(
    (text: string) => {
      const cursorPos = inputRef.current?.selectionStart || text.length;
      const beforeCursor = text.slice(0, cursorPos);

      // Check if cursor is inside a completed mention token @[...](...)
      // If so, don't show dropdown
      const tokenRe = /@\[[^\]]*\]\([a-f0-9-]{36}\)/g;
      let m;
      while ((m = tokenRe.exec(beforeCursor)) !== null) {
        if (cursorPos >= m.index && cursorPos <= m.index + m[0].length) {
          setShowDropdown(false);
          return;
        }
      }

      // Strip completed tokens to find bare @ triggers
      const stripped = beforeCursor.replace(/@\[[^\]]*\]\([a-f0-9-]{36}\)/g, "X".repeat(38));
      const atIndex = stripped.lastIndexOf("@");

      if (atIndex === -1 || (atIndex > 0 && stripped[atIndex - 1] !== " " && atIndex !== 0)) {
        if (atIndex > 0 && stripped[atIndex - 1] !== " ") {
          setShowDropdown(false);
          return;
        }
      }

      if (atIndex >= 0) {
        const query = stripped.slice(atIndex + 1).toLowerCase();
        if (query.length > 30) {
          setShowDropdown(false);
          return;
        }
        setMentionQuery(query);
        const filtered = allUsers.filter((u) =>
          getName(u).toLowerCase().includes(query)
        ).slice(0, 6);
        setSuggestions(filtered);
        setShowDropdown(filtered.length > 0);
        setSelectedIndex(0);
      } else {
        setShowDropdown(false);
      }
    },
    [allUsers]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    checkForMention(newValue);
  };

  const insertMention = (user: MentionUser) => {
    const cursorPos = inputRef.current?.selectionStart || value.length;
    const beforeCursor = value.slice(0, cursorPos);
    const atIndex = beforeCursor.lastIndexOf("@");
    const afterCursor = value.slice(cursorPos);

    const name = getName(user);
    const token = buildMentionToken(name, user.user_id);
    const newValue = beforeCursor.slice(0, atIndex) + token + " " + afterCursor;
    onChange(newValue);
    setShowDropdown(false);

    // Refocus input
    setTimeout(() => {
      inputRef.current?.focus();
      const newPos = atIndex + token.length + 1;
      inputRef.current?.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showDropdown) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        if (suggestions[selectedIndex]) {
          e.preventDefault();
          insertMention(suggestions[selectedIndex]);
          return;
        }
      }
      if (e.key === "Escape") {
        setShowDropdown(false);
        return;
      }
    }
    onKeyDown?.(e);
  };

  return (
    <div className="relative flex-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("h-9 rounded-xl text-sm", className)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
      />

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full mb-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
        >
          {suggestions.map((user, i) => {
            const name = getName(user);
            return (
              <button
                key={user.user_id}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                  i === selectedIndex && "bg-accent"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(user);
                }}
              >
                <Avatar className="h-6 w-6">
                  {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                  <AvatarFallback className="text-[10px] bg-muted">
                    {name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
