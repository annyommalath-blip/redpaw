import { Home, Users, PlusCircle, MessageCircle, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Badge } from "@/components/ui/badge";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const { totalUnread } = useUnreadMessages();
  const { t } = useTranslation();

  const navItems = [
    { to: "/", icon: Home, label: t("nav.home") },
    { to: "/community", icon: Users, label: t("nav.community") },
    { to: "/create", icon: PlusCircle, label: t("nav.create"), isCreate: true },
    { to: "/messages", icon: MessageCircle, label: t("nav.messages") },
    { to: "/profile", icon: User, label: t("nav.profile") },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-nav safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={cn(
              "relative flex flex-col items-center gap-1 px-3 py-2 rounded-2xl text-muted-foreground transition-all duration-200",
              item.isCreate && "relative"
            )}
            activeClassName="text-primary bg-primary/10"
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                <div className={cn(
                  "relative flex items-center justify-center",
                  item.isCreate && "h-12 w-12 -mt-4 rounded-full bg-primary text-primary-foreground shadow-glow"
                )}>
                  <item.icon className={cn(
                    "transition-transform duration-200",
                    item.isCreate ? "h-6 w-6" : "h-5 w-5",
                    isActive && !item.isCreate && "scale-110"
                  )} />
                  {item.to === "/messages" && totalUnread > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1.5 -right-1.5 h-5 min-w-5 flex items-center justify-center p-0 text-xs font-bold border-2 border-white dark:border-card"
                    >
                      {totalUnread > 99 ? "99+" : totalUnread}
                    </Badge>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-medium transition-colors",
                  item.isCreate && "mt-1"
                )}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
