import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Loader2 } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { EmptyState } from "@/components/ui/empty-state";
import { useNotifications, Notification } from "@/hooks/useNotifications";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const hasAutoMarkedRef = useRef(false);

  // Auto-mark all notifications as read when the screen opens
  useEffect(() => {
    if (!loading && unreadCount > 0 && !hasAutoMarkedRef.current) {
      hasAutoMarkedRef.current = true;
      markAllAsRead();
    }
  }, [loading, unreadCount, markAllAsRead]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read (will be quick since likely already marked by auto-mark)
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate based on link_type
    switch (notification.link_type) {
      case "care_request":
        if (notification.link_id) {
          navigate(`/care-request/${notification.link_id}`);
        }
        break;
      case "lost_alert":
        if (notification.link_id) {
          navigate(`/lost-alert/${notification.link_id}`);
        }
        break;
      case "dog":
        if (notification.link_id) {
          navigate(`/dog/${notification.link_id}`);
        }
        break;
      case "found_dog":
        if (notification.link_id) {
          navigate(`/found-dog/${notification.link_id}`);
        }
        break;
      default:
        // Stay on notifications page
        break;
    }
  };

  return (
    <MobileLayout>
      <PageHeader 
        title="Notifications" 
        subtitle="Stay updated"
      />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : notifications.length > 0 ? (
        <div className="flex flex-col">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              id={notification.id}
              type={notification.type}
              title={notification.title}
              body={notification.body}
              isRead={notification.is_read}
              createdAt={new Date(notification.created_at)}
              onClick={() => handleNotificationClick(notification)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Bell className="h-10 w-10 text-muted-foreground" />}
          title="No notifications yet"
          description="You'll be notified about care assignments, sightings, and more."
        />
      )}
    </MobileLayout>
  );
}