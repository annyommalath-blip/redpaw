/**
 * Username-based mention system.
 * Mentions are stored as plain @username in text.
 * The regex detects @username tokens for rendering as clickable links.
 */

/** Regex to match @username tokens (lowercase, digits, underscore, dot) */
const MENTION_RE = /@([a-z0-9_.]{1,30})\b/g;

/** Extract unique mentioned usernames from text */
export function extractMentionedUsernames(text: string): string[] {
  const usernames = new Set<string>();
  const re = new RegExp(MENTION_RE.source, "g");
  let match;
  while ((match = re.exec(text)) !== null) {
    usernames.add(match[1]);
  }
  return [...usernames];
}

/**
 * Split text into parts for rendering.
 * Returns array of { type: 'text' | 'mention', value }
 */
export interface MentionPart {
  type: "text" | "mention";
  value: string; // for mention, this is the username (without @)
}

export function parseMentionParts(text: string): MentionPart[] {
  const parts: MentionPart[] = [];
  const re = new RegExp(MENTION_RE.source, "g");
  let lastIndex = 0;
  let match;

  while ((match = re.exec(text)) !== null) {
    // The full match includes the @ sign
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "mention", value: match[1] });
    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts;
}
