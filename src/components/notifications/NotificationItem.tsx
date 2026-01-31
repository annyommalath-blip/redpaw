import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import { 
  Bell, 
  AlertTriangle, 
  Calendar, 
  Syringe, 
  Eye,
  UserCheck,
  UserPlus,
  UserMinus,
  MessageSquare,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDateLocale } from "@/hooks/useDateLocale";

interface NotificationItemProps {
  id: string;
  type: string;
  title: string;
  body: string;
  bodyParams?: Record<string, string | number> | null;
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
  dog_invite: Users,
  dog_invite_accepted: UserCheck,
  dog_invite_declined: UserMinus,
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
  dog_invite: "text-violet-600 bg-violet-100",
  dog_invite_accepted: "text-green-600 bg-green-100",
  dog_invite_declined: "text-amber-600 bg-amber-100",
};

export function NotificationItem({
  type,
  title,
  body,
  bodyParams,
  isRead,
  createdAt,
  onClick,
}: NotificationItemProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const Icon = typeIcons[type] || Bell;
  const colorClass = typeColors[type] || "text-muted-foreground bg-muted";

  // Use translated title based on notification type
  const translatedTitle = t(`notifications.types.${type}`, { defaultValue: title });

  // Get translated body using body_params if available
  const getTranslatedBody = (): string => {
    if (!bodyParams) {
      return body; // Fallback to original body for old notifications
    }

    // Handle different notification types
    switch (type) {
      case "new_application":
        return t("notifications.bodies.new_application", bodyParams);
      case "application_withdrawn":
        return t("notifications.bodies.application_withdrawn", bodyParams);
      case "care_reapply":
        return t("notifications.bodies.care_reapply", bodyParams);
      case "assigned_job_sitter": {
        const dogCount = bodyParams.dogCount as number;
        const careType = t(`notifications.careTypes.${bodyParams.careType}`, { defaultValue: bodyParams.careType });
        if (dogCount === 1) {
          return t("notifications.bodies.assigned_job_sitter_single", { ...bodyParams, careType });
        }
        return t("notifications.bodies.assigned_job_sitter_multi", { ...bodyParams, careType });
      }
      case "sighting_reported":
        return t("notifications.bodies.sighting_reported", bodyParams);
      case "found_dog_reply":
        return t("notifications.bodies.found_dog_reply", bodyParams);
      case "medication_expiring": {
        // Check if it's expired or expiring
        if (bodyParams.days) {
          return t("notifications.bodies.medication_expiring_days", bodyParams);
        }
        return t("notifications.bodies.medication_expired", bodyParams);
      }
      case "dog_invite":
        return t("notifications.bodies.dog_invite", bodyParams);
      case "dog_invite_accepted":
        return t("notifications.bodies.dog_invite_accepted", bodyParams);
      case "dog_invite_declined":
        return t("notifications.bodies.dog_invite_declined", bodyParams);
      default:
        return body;
    }
  };

  const translatedBody = getTranslatedBody();

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
            {translatedTitle}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatDistanceToNow(createdAt, { addSuffix: true, locale: dateLocale })}
          </span>
        </div>
        <p className={cn(
          "text-sm line-clamp-2 mt-0.5",
          isRead ? "text-muted-foreground" : "text-foreground"
        )}>
          {translatedBody}
        </p>
      </div>

      {/* Unread dot */}
      {!isRead && (
        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
      )}
    </button>
  );
}
