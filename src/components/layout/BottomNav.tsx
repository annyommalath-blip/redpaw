import { Home, Users, PlusCircle, MessageCircle, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Badge } from "@/components/ui/badge";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/community", icon: Users, label: "Community" },
  { to: "/create", icon: PlusCircle, label: "Create" },
  { to: "/messages", icon: MessageCircle, label: "Messages" },
  { to: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const unreadCount = useUnreadMessageCount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className="relative flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-muted-foreground transition-colors"
            activeClassName="text-primary bg-accent"
          >
            <div className="relative">
              <item.icon className="h-6 w-6" />
              {item.to === "/messages" && unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </div>
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
