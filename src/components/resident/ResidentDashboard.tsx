import { useState, useEffect } from "react";
import { Users, History, Shield, MapPin, Copy, Check, Loader2, Phone, BellOff, BellRing, Share2, HelpCircle, MessageSquare, DoorOpen, ShoppingCart, Receipt, Sparkles, Mail, Package, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ShareANRDialog from "./ShareANRDialog";
import BottomNav from "@/components/layout/BottomNav";
import { useVisitorMessages } from "@/hooks/useVisitorMessages";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useSupportChat } from "@/contexts/SupportChatContext";
import logoAnr from "@/assets/logo-anr.png";
interface Resident {
  id: string;
  user_id: string;
  is_owner: boolean;
  is_muted: boolean;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    phone_number: string;
  };
}
interface HabitationData {
  id: string;
  name: string;
  anr: {
    id: string;
    code: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  residents: Resident[];
}
const ResidentDashboard = () => {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [habitationData, setHabitationData] = useState<HabitationData | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [currentResidentId, setCurrentResidentId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [togglingMute, setTogglingMute] = useState(false);
  const [currentUserName, setCurrentUserName] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [copilotEnabled, setCopilotEnabled] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const {
    flags
  } = useFeatureFlags();
  // Use countOnly mode for dashboard - much faster
  const {
    unreadCount: unreadMessagesCount
  } = useVisitorMessages(habitationData?.id || "", true);
  const {
    setIsOpen: setSupportChatOpen
  } = useSupportChat();

  // Check if user has copilot enabled (pro company)
  useEffect(() => {
    const checkCopilot = async () => {
      if (!user) return;
      const {
        data
      } = await supabase.from("pro_company_roles").select("company:pro_companies(copilot_enabled)").eq("user_id", user.id).maybeSingle();
      if (data?.company && (data.company as any).copilot_enabled) {
        setCopilotEnabled(true);
      }
    };
    checkCopilot();
  }, [user]);
  useEffect(() => {
    if (user) {
      fetchHabitationData();
    }
  }, [user, retryCount]);
  const fetchHabitationData = async () => {
    try {
      // Single query to get resident data with habitation and ANR
      const {
        data: residentData,
        error: residentError
      } = await supabase.from("residents").select(`
          id, 
          habitation_id, 
          is_owner, 
          is_muted,
          habitations:habitation_id (
            id,
            name,
            anrs:anr_id (id, code, address, latitude, longitude)
          )
        `).eq("user_id", user?.id).eq("status", "verified").maybeSingle();
      if (residentError) throw residentError;
      if (!residentData) {
        if (retryCount < 5) {
          console.log(`[Dashboard] Resident not found, retrying (${retryCount + 1}/5)...`);
          setTimeout(() => setRetryCount(prev => prev + 1), 1000);
          return;
        }
        const {
          data: subscription
        } = await supabase.from("subscriptions").select("id, status").eq("user_id", user?.id).eq("status", "active").maybeSingle();
        if (subscription) {
          navigate("/no-habitation");
        } else {
          navigate("/register");
        }
        return;
      }
      setIsOwner(residentData.is_owner || false);
      setCurrentResidentId(residentData.id);
      setIsMuted(residentData.is_muted || false);
      const habitation = residentData.habitations as any;
      if (!habitation) throw new Error("Habitation not found");

      // Parallel fetch: profile + other residents
      const [profileResult, residentsResult] = await Promise.all([supabase.from("profiles").select("first_name, last_name").eq("id", user?.id).single(), supabase.from("residents").select("id, user_id, is_owner, is_muted").eq("habitation_id", residentData.habitation_id).eq("status", "verified")]);
      if (profileResult.data) {
        setCurrentUserName(`${profileResult.data.first_name || ""} ${profileResult.data.last_name || ""}`.trim());
      }

      // Fetch profiles for residents in parallel
      const residents = residentsResult.data || [];
      const residentsWithProfiles: Resident[] = await Promise.all(residents.map(async resident => {
        const {
          data: profile
        } = await supabase.from("profiles").select("first_name, last_name, phone_number").eq("id", resident.user_id).single();
        return {
          ...resident,
          profile: profile || undefined
        };
      }));
      setHabitationData({
        id: habitation.id,
        name: habitation.name,
        anr: habitation.anrs as any,
        residents: residentsWithProfiles
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger les données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const copyCode = () => {
    if (habitationData?.anr.code) {
      navigator.clipboard.writeText(habitationData.anr.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const toggleMute = async () => {
    if (!currentResidentId || togglingMute) return;
    setTogglingMute(true);
    try {
      const newMuteState = !isMuted;
      const {
        error
      } = await supabase.from("residents").update({
        is_muted: newMuteState
      }).eq("id", currentResidentId);
      if (error) throw error;
      setIsMuted(newMuteState);
      toast({
        title: newMuteState ? "Notifications désactivées" : "Notifications activées",
        description: newMuteState ? "Vous ne recevrez plus les appels entrants" : "Vous recevrez à nouveau les appels entrants"
      });
    } catch (error: any) {
      console.error("[Dashboard] Toggle mute error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le paramètre",
        variant: "destructive"
      });
    } finally {
      setTogglingMute(false);
    }
  };
  const testIncomingCall = async () => {
    if (!habitationData || !user) return;
    try {
      toast({
        title: "Création appel test...",
        description: "Attendez quelques secondes"
      });
      const {
        data: callLog,
        error: clError
      } = await supabase.from("call_logs").insert({
        habitation_id: habitationData.id,
        status: "ringing"
      }).select().single();
      if (clError) throw clError;
      console.log("[TEST] Created call log:", callLog.id);
      const {
        error: pError
      } = await supabase.from("call_participants").insert({
        call_id: callLog.id,
        user_id: user.id,
        habitation_id: habitationData.id,
        role: "resident",
        status: "ringing"
      });
      if (pError) throw pError;
      console.log("[TEST] Created participant for user:", user.id);
      toast({
        title: "Appel test créé!",
        description: "L'appel devrait s'afficher maintenant"
      });
      setTimeout(async () => {
        await supabase.from("call_logs").update({
          status: "ended",
          ended_at: new Date().toISOString()
        }).eq("id", callLog.id);
        console.log("[TEST] Auto-ended test call");
      }, 15000);
    } catch (error: any) {
      console.error("[TEST] Error:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  if (!habitationData) {
    return <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Aucune habitation trouvée</p>
          <Button onClick={() => navigate("/register")}>Créer un ANR</Button>
        </div>
      </div>;
  }
  return <div className="min-h-screen pb-20 bg-background">
      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="pt-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-foreground text-base">Mon Adresse Numérique Résidentielle</h1>
            <p className="text-muted-foreground pt-1 text-sm font-extrabold">{habitationData.anr.address}</p>
          </div>
          <NotificationBell />
        </div>

        {/* ANR Card - Neumorphic */}
        <div className="bg-card rounded-3xl p-6 shadow-neumorphic">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="w-20 h-20 flex-shrink-0 bg-primary/10 rounded-2xl p-2 shadow-neumorphic-inset flex items-center justify-center">
              <img src={logoAnr} alt="ANR" className="w-full h-full object-contain" />
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                <span className="text-2xl font-mono font-bold tracking-wider text-foreground">{habitationData.anr.code}</span>
                <Button variant="ghost" size="sm" onClick={copyCode} className="h-8 w-8 p-0">
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-4">
                <span className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium flex items-center gap-1 shadow-neumorphic-sm">
                  <Shield className="w-3 h-3" />
                  Validé
                </span>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center gap-1 shadow-neumorphic-sm">
                  <MapPin className="w-3 h-3" />
                  GPS configuré
                </span>
              </div>
              
              <Button variant="outline" size="sm" onClick={() => setShareDialogOpen(true)}>
                <Share2 className="w-4 h-4 mr-2" />
                Partager mon ANR
              </Button>
            </div>
          </div>
        </div>

        {/* Quick actions - Neumorphic grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAction icon={<Users className="w-6 h-6" />} label="Résidents" count={habitationData.residents.length} onClick={() => navigate("/residents")} color="blue" />
          {flags.visitorTextMessagesEnabled && <QuickAction icon={<MessageSquare className="w-6 h-6" />} label="Messages" badge={unreadMessagesCount} onClick={() => navigate("/messages")} color="purple" />}
          <QuickAction icon={<History className="w-6 h-6" />} label="Historique" onClick={() => navigate("/call-history")} color="amber" />
          <QuickAction icon={isMuted ? <BellOff className="w-6 h-6" /> : <BellRing className="w-6 h-6" />} label={isMuted ? "En sourdine" : "Notifications"} onClick={toggleMute} active={isMuted} color="orange" />
          <QuickAction icon={<Receipt className="w-6 h-6" />} label="Commandes" onClick={() => navigate("/orders")} color="teal" />
          <QuickAction icon={<ShoppingCart className="w-6 h-6" />} label="Boutique" onClick={() => navigate("/shop")} color="pink" />
          {flags.doorOpeningEnabled && <QuickAction icon={<DoorOpen className="w-6 h-6" />} label="Accès porte" onClick={() => navigate("/door-access")} color="rose" />}
          {isOwner && <QuickAction icon={<MapPin className="w-6 h-6" />} label="Position GPS" onClick={() => navigate("/update-gps")} color="green" />}
          {copilotEnabled && <QuickAction icon={<Sparkles className="w-6 h-6" />} label="Co-Pilot" onClick={() => navigate("/pro")} color="cyan" />}
          {flags.relayModuleEnabled && <QuickAction icon={<Package className="w-6 h-6" />} label="Devenir relais" onClick={() => navigate("/relay")} color="teal" />}
          {flags.referralEnabled && <QuickAction icon={<Gift className="w-6 h-6" />} label="Parrainage" onClick={() => navigate("/referral")} color="purple" />}
          <QuickAction icon={<Mail className="w-6 h-6" />} label="Support" onClick={() => setSupportChatOpen(true)} color="blue" />
        </div>

        {/* Test Call Button */}
        <Button onClick={testIncomingCall} className="w-full bg-warning hover:bg-warning/90 text-warning-foreground">
          <Phone className="w-4 h-4 mr-2" />
          🧪 Tester appel entrant
        </Button>
      </div>

      <ShareANRDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} anrCode={habitationData.anr.code} anrAddress={habitationData.anr.address} latitude={habitationData.anr.latitude} longitude={habitationData.anr.longitude} ownerName={currentUserName || "Résident"} />

      <BottomNav />
    </div>;
};
const QuickAction = ({
  icon,
  label,
  count,
  badge,
  onClick,
  active,
  color = "blue"
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  badge?: number;
  onClick: () => void;
  active?: boolean;
  color?: "blue" | "orange" | "amber" | "green" | "purple" | "cyan" | "rose" | "pink" | "teal";
}) => {
  const colorClasses = {
    blue: "text-blue-600 bg-blue-50",
    orange: "text-orange-600 bg-orange-50",
    amber: "text-amber-600 bg-amber-50",
    green: "text-green-600 bg-green-50",
    purple: "text-purple-600 bg-purple-50",
    cyan: "text-cyan-600 bg-cyan-50",
    rose: "text-rose-600 bg-rose-50",
    pink: "text-pink-600 bg-pink-50",
    teal: "text-teal-600 bg-teal-50"
  };
  const bgClass = colorClasses[color].split(" ")[1];
  const textClass = colorClasses[color].split(" ")[0];
  return <button onClick={onClick} className={`bg-card rounded-2xl p-4 flex flex-col items-center gap-2 transition-all duration-200 shadow-neumorphic hover:shadow-neumorphic-pressed active:shadow-neumorphic-inset ${active ? "shadow-neumorphic-inset" : ""}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center relative ${bgClass} ${textClass} shadow-neumorphic-sm`}>
        {icon}
        {badge !== undefined && badge > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center px-1">
            {badge > 99 ? "99+" : badge}
          </span>}
      </div>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {count !== undefined && <span className="text-xs text-muted-foreground">{count}</span>}
    </button>;
};
export default ResidentDashboard;