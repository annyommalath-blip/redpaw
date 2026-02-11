import type { MentionUser } from "@/components/feed/MentionInput";

/**
 * Mention token format: @[Display Name](user_id)
 * This structured format allows parsing mentions for rendering as clickable links.
 */

/** Insert a structured mention token into text */
export function buildMentionToken(name: string, userId: string): string {
  return `@[${name}](${userId})`;
}

/** Regex to match mention tokens: @[Name](uuid) */
export const MENTION_TOKEN_RE = /@\[([^\]]+)\]\(([a-f0-9-]{36})\)/g;

/** Parse mention tokens from text, return unique user IDs */
export function extractMentionedUserIds(text: string): string[] {
  const ids = new Set<string>();
  let match;
  const re = new RegExp(MENTION_TOKEN_RE.source, "g");
  while ((match = re.exec(text)) !== null) {
    ids.add(match[2]);
  }
  return [...ids];
}

/**
 * Split text into parts for rendering.
 * Returns array of { type: 'text' | 'mention', value, userId? }
 */
export interface MentionPart {
  type: "text" | "mention";
  value: string;
  userId?: string;
}

export function parseMentionParts(text: string): MentionPart[] {
  const parts: MentionPart[] = [];
  const re = new RegExp(MENTION_TOKEN_RE.source, "g");
  let lastIndex = 0;
  let match;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "mention", value: match[1], userId: match[2] });
    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts;
}
