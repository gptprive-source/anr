import { Home, QrCode, User, Building2, Users, MessageSquare } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useProCompanyCheck } from "@/hooks/useProCompanyCheck";
import { useChats } from "@/hooks/useChats";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  badge?: number;
}

const BottomNav = () => {
  const location = useLocation();
  const { isProUser } = useProCompanyCheck();
  const { unreadCount } = useChats();

  const navItems: NavItem[] = [
    { icon: <Home className="w-6 h-6" />, label: "Dashboard", path: "/dashboard" },
    { icon: <QrCode className="w-6 h-6" />, label: "Visiteur", path: "/visitor" },
    { 
      icon: <MessageSquare className="w-6 h-6" />, 
      label: "Messages", 
      path: "/messages",
      badge: unreadCount 
    },
    { icon: <Users className="w-6 h-6" />, label: "Contacts", path: "/contacts" },
    ...(isProUser ? [{ icon: <Building2 className="w-6 h-6" />, label: "PRO", path: "/pro" }] : []),
    { icon: <User className="w-6 h-6" />, label: "Compte", path: "/account" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card shadow-[0_-4px_12px_rgba(163,177,198,0.4)] safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = item.path === "/" 
            ? location.pathname === "/" 
            : location.pathname === item.path || location.pathname.startsWith(item.path + "/");
          return (
            <Link
              key={item.path}
              to={item.path}
              data-copilot-id={`bottom-nav-${item.label.toLowerCase()}`}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200 relative",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-neumorphic-sm" 
                  : ""
              )}>
                {item.icon}
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
