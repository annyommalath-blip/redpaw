import { useState, useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { extractMentionedUsernames } from "@/lib/mentionUtils";

export interface MentionUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  score?: number;
  match_type?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/** Extract mentioned usernames from text */
export function parseMentions(text: string): string[] {
  return extractMentionedUsernames(text);
}

function getName(u: MentionUser): string {
  if (u.username) return `@${u.username}`;
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
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!user) return;
      
      const { data, error } = await supabase.rpc("get_mention_suggestions", {
        p_user_id: user.id,
        p_query: query,
        p_limit: query.length < 2 ? 12 : 20,
      });

      if (!error && data) {
        setSuggestions(data as MentionUser[]);
        setShowDropdown(data.length > 0);
        setSelectedIndex(0);
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    },
    [user]
  );

  const checkForMention = useCallback(
    (text: string) => {
      const cursorPos = inputRef.current?.selectionStart || text.length;
      const beforeCursor = text.slice(0, cursorPos);

      const atIndex = beforeCursor.lastIndexOf("@");

      if (atIndex === -1 || (atIndex > 0 && beforeCursor[atIndex - 1] !== " " && atIndex !== 0)) {
        if (atIndex > 0 && beforeCursor[atIndex - 1] !== " ") {
          setShowDropdown(false);
          return;
        }
      }

      if (atIndex >= 0) {
        const query = beforeCursor.slice(atIndex + 1).toLowerCase();
        if (query.length > 30 || query.includes(" ")) {
          setShowDropdown(false);
          return;
        }
        
        // Debounce the API call
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          fetchSuggestions(query);
        }, 150);
      } else {
        setShowDropdown(false);
      }
    },
    [fetchSuggestions]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    checkForMention(newValue);
  };

  const insertMention = (mentionUser: MentionUser) => {
    if (!mentionUser.username) return;
    const cursorPos = inputRef.current?.selectionStart || value.length;
    const beforeCursor = value.slice(0, cursorPos);
    const atIndex = beforeCursor.lastIndexOf("@");
    const afterCursor = value.slice(cursorPos);

    const mention = `@${mentionUser.username}`;
    const newValue = beforeCursor.slice(0, atIndex) + mention + " " + afterCursor;
    onChange(newValue);
    setShowDropdown(false);

    setTimeout(() => {
      inputRef.current?.focus();
      const newPos = atIndex + mention.length + 1;
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
          {suggestions.map((su, i) => {
            const name = getName(su);
            return (
              <button
                key={su.user_id}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                  i === selectedIndex && "bg-accent"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(su);
                }}
              >
                <Avatar className="h-6 w-6">
                  {su.avatar_url && <AvatarImage src={su.avatar_url} />}
                  <AvatarFallback className="text-[10px] bg-muted">
                    {name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="truncate font-medium">{name}</span>
                  {su.username && su.display_name && (
                    <span className="truncate text-xs text-muted-foreground">
                      {su.display_name}
                      {su.match_type === "global" && (
                        <span className="ml-1 text-muted-foreground/60">·</span>
                      )}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
