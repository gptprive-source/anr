import { Home, QrCode, User, Building2, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useProCompanyCheck } from "@/hooks/useProCompanyCheck";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

const BottomNav = () => {
  const location = useLocation();
  const { isProUser } = useProCompanyCheck();

  const navItems: NavItem[] = [
    { icon: <Home className="w-6 h-6" />, label: "Dashboard", path: "/dashboard" },
    { icon: <QrCode className="w-6 h-6" />, label: "Visiteur", path: "/visitor" },
    { icon: <Users className="w-6 h-6" />, label: "Contacts", path: "/contacts" },
    ...(isProUser ? [{ icon: <Building2 className="w-6 h-6" />, label: "PRO", path: "/pro" }] : []),
    { icon: <User className="w-6 h-6" />, label: "Compte", path: "/account" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border safe-area-bottom">
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
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
