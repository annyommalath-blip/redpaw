import { useNavigate } from "react-router-dom";
import { parseMentionParts } from "@/lib/mentionUtils";

interface MentionTextProps {
  text: string;
  className?: string;
}

/**
 * Renders text with @[Name](userId) tokens as clickable mention links.
 */
export default function MentionText({ text, className }: MentionTextProps) {
  const navigate = useNavigate();
  const parts = parseMentionParts(text);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.type === "mention" ? (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/user/${part.userId}`);
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
