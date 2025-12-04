import { ReactNode, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { 
  LayoutDashboard, 
  Settings, 
  HelpCircle, 
  Users, 
  CreditCard, 
  UserCog, 
  ScrollText,
  BarChart3,
  Menu,
  X,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/admin/config', label: 'Configuration', icon: Settings },
  { path: '/admin/faq', label: 'FAQ', icon: HelpCircle },
  { path: '/admin/users', label: 'Utilisateurs', icon: Users },
  { path: '/admin/subscriptions', label: 'Abonnements', icon: CreditCard },
  { path: '/admin/team', label: 'Équipe', icon: UserCog },
  { path: '/admin/audit', label: 'Journal d\'audit', icon: ScrollText },
];

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { isAdmin, isSuperAdmin, role, loading } = useAdminAuth();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [loading, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn(
      "flex flex-col h-full bg-card border-r border-border",
      mobile ? "w-full" : "w-64"
    )}>
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-primary">ANR Admin</h1>
        <p className="text-sm text-muted-foreground capitalize">{role}</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => mobile && setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2"
          onClick={() => navigate('/dashboard')}
        >
          <LayoutDashboard className="w-4 h-4" />
          Retour à l'app
        </Button>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 text-destructive hover:text-destructive"
          onClick={() => signOut()}
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Header & Sidebar */}
      <div className="flex-1 flex flex-col">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <h1 className="text-lg font-bold text-primary">ANR Admin</h1>
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <Sidebar mobile />
            </SheetContent>
          </Sheet>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
