import { ReactNode, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { usePendingSupport } from "@/hooks/usePendingSupport";
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
  LogOut,
  MessageCircle,
  FileText,
  Shield,
  Package,
  MapPin,
  Phone,
  ShieldCheck, 
  Bot, 
  Mail, 
  Scale, 
  BookOpen, 
  Building2, 
  UserCheck, 
  AlertTriangle, 
  ClipboardList, 
  DoorOpen, 
  Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/admin/daily-usage', label: 'Coûts Daily', icon: Phone },
  { path: '/admin/orders', label: 'Commandes', icon: Package },
  { path: '/admin/parcels', label: 'Colis Livraison', icon: Package },
  { path: '/admin/anrs', label: 'ANRs', icon: MapPin },
  { path: '/admin/door-modules', label: 'Modules porte', icon: DoorOpen },
  { path: '/admin/config', label: 'Configuration', icon: Settings },
  { path: '/admin/email-variables', label: 'Variables Email', icon: FileText },
  { path: '/admin/documents', label: 'Documents & Emails', icon: Mail },
  { path: '/admin/faq', label: 'FAQ', icon: HelpCircle },
  { path: '/admin/cgu', label: 'CGU', icon: FileText },
  { path: '/admin/privacy', label: 'Confidentialité', icon: Shield },
  { path: '/admin/users', label: 'Utilisateurs', icon: Users },
  { path: '/admin/subscriptions', label: 'Abonnements', icon: CreditCard },
  { path: '/admin/referrals', label: 'Affiliations', icon: Gift },
  { path: '/admin/communications', label: 'Communications', icon: MessageCircle },
  { path: '/admin/messages', label: 'Messages', icon: Mail },
  { path: '/admin/support', label: 'Support', icon: MessageCircle, badgeKey: 'support' },
  { path: '/admin/chatbot', label: 'Stats Chatbot', icon: Bot },
  { path: '/admin/chatbot-corrections', label: 'Corrections IA', icon: BookOpen },
  { path: '/admin/team', label: 'Équipe', icon: UserCog },
  { path: '/admin/audit', label: 'Journal d\'audit', icon: ScrollText },
  { path: '/admin/security', label: 'Sécurité', icon: ShieldCheck },
  { path: '/admin/relay', label: 'Module Relais', icon: Package },
  { path: '/admin/rgpd', label: 'RGPD', icon: Scale },
  { path: '/admin/rgpd/registry', label: 'Registre', icon: BookOpen },
  { path: '/admin/rgpd/subprocessors', label: 'Sous-traitants', icon: Building2 },
  { path: '/admin/rgpd/requests', label: 'Demandes droits', icon: UserCheck },
  { path: '/admin/rgpd/consents', label: 'Consentements', icon: ClipboardList },
  { path: '/admin/rgpd/incidents', label: 'Incidents', icon: AlertTriangle },
];

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { isAdmin, isSuperAdmin, role, loading } = useAdminAuth();
  const { signOut } = useAuth();
  const { pendingCount: supportCount } = usePendingSupport();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const totalBadgeCount = supportCount;

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
      "flex flex-col h-full bg-card shadow-neumorphic",
      mobile ? "w-full" : "w-64"
    )}>
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-primary">ANR Admin</h1>
        <p className="text-sm text-muted-foreground capitalize">{role}</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const badgeCount = item.badgeKey === 'support' ? supportCount : 0;
          const showBadge = badgeCount > 0;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => mobile && setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-neumorphic-sm" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="flex-1">{item.label}</span>
              {showBadge && (
                <Badge 
                  variant="destructive" 
                  className="h-5 min-w-5 flex items-center justify-center p-0 text-xs animate-pulse"
                >
                  {badgeCount}
                </Badge>
              )}
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
        <header className="md:hidden flex items-center justify-between p-4 bg-card shadow-neumorphic-sm">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-primary">ANR Admin</h1>
            {totalBadgeCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center p-0 text-xs animate-pulse">
                {totalBadgeCount}
              </Badge>
            )}
          </div>
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
