import { formatDistanceToNow } from "date-fns";
import { 
  Bell, 
  AlertTriangle, 
  Calendar, 
  Syringe, 
  Eye,
  UserCheck,
  UserPlus,
  UserMinus,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: Date;
  onClick: () => void;
}

const typeIcons: Record<string, typeof Bell> = {
  new_application: UserPlus,
  application_withdrawn: UserMinus,
  care_reapply: UserPlus,
  assigned_job_owner: UserCheck,
  assigned_job_sitter: UserCheck,
  lost_dog_nearby: AlertTriangle,
  care_request_nearby: Calendar,
  medication_expiring: Syringe,
  sighting_reported: Eye,
  found_dog_reply: MessageSquare,
};

const typeColors: Record<string, string> = {
  new_application: "text-blue-600 bg-blue-100",
  application_withdrawn: "text-amber-600 bg-amber-100",
  care_reapply: "text-indigo-600 bg-indigo-100",
  assigned_job_owner: "text-green-600 bg-green-100",
  assigned_job_sitter: "text-green-600 bg-green-100",
  lost_dog_nearby: "text-red-600 bg-red-100",
  care_request_nearby: "text-blue-600 bg-blue-100",
  medication_expiring: "text-orange-600 bg-orange-100",
  sighting_reported: "text-purple-600 bg-purple-100",
  found_dog_reply: "text-teal-600 bg-teal-100",
};

export function NotificationItem({
  type,
  title,
  body,
  isRead,
  createdAt,
  onClick,
}: NotificationItemProps) {
  const Icon = typeIcons[type] || Bell;
  const colorClass = typeColors[type] || "text-muted-foreground bg-muted";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 p-4 text-left border-b border-border transition-colors hover:bg-accent",
        !isRead && "bg-primary/5"
      )}
    >
      {/* Icon */}
      <div className={cn("p-2 rounded-full shrink-0", colorClass)}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className={cn(
            "text-sm text-foreground line-clamp-1",
            !isRead && "font-semibold"
          )}>
            {title}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </span>
        </div>
        <p className={cn(
          "text-sm line-clamp-2 mt-0.5",
          isRead ? "text-muted-foreground" : "text-foreground"
        )}>
          {body}
        </p>
      </div>

      {/* Unread dot */}
      {!isRead && (
        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
      )}
    </button>
  );
}
