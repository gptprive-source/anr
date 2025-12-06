import { useState, useEffect } from "react";
import { Users, History, Shield, MapPin, Copy, Check, Loader2, Phone, BellOff, BellRing, Share2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ShareANRDialog from "./ShareANRDialog";
import BottomNav from "@/components/layout/BottomNav";
import VisitorMessagesSection from "./VisitorMessagesSection";
import { useVisitorMessages } from "@/hooks/useVisitorMessages";
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
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  useEffect(() => {
    if (user) {
      fetchHabitationData();
    }
  }, [user]);
  const fetchHabitationData = async () => {
    try {
      // Get user's resident record
      const {
        data: residentData,
        error: residentError
      } = await supabase.from("residents").select(`
          id,
          habitation_id,
          is_owner,
          is_muted
        `).eq("user_id", user?.id).eq("status", "verified").maybeSingle();
      if (residentError) throw residentError;
      if (!residentData) {
        // Check if user has an active subscription
        const {
          data: subscription
        } = await supabase.from("subscriptions").select("id, status").eq("user_id", user?.id).eq("status", "active").maybeSingle();
        if (subscription) {
          // User has subscription but no habitation - redirect to rejoin page
          navigate("/no-habitation");
        } else {
          // No subscription, redirect to register
          navigate("/register");
        }
        return;
      }
      setIsOwner(residentData.is_owner || false);
      setCurrentResidentId(residentData.id);
      setIsMuted(residentData.is_muted || false);

      // Get current user profile name
      const {
        data: profileData
      } = await supabase.from("profiles").select("first_name, last_name").eq("id", user?.id).single();
      if (profileData) {
        setCurrentUserName(`${profileData.first_name || ""} ${profileData.last_name || ""}`.trim());
      }

      // Get habitation with ANR and all residents
      const {
        data: habitation,
        error: habError
      } = await supabase.from("habitations").select(`
          id,
          name,
          anrs (
            id,
            code,
            address,
            latitude,
            longitude
          )
        `).eq("id", residentData.habitation_id).single();
      if (habError) throw habError;

      // Get all residents of this habitation with their profiles
      const {
        data: residents,
        error: resError
      } = await supabase.from("residents").select(`
          id,
          user_id,
          is_owner,
          is_muted
        `).eq("habitation_id", residentData.habitation_id).eq("status", "verified");
      if (resError) throw resError;

      // Fetch profiles for each resident
      const residentsWithProfiles: Resident[] = await Promise.all((residents || []).map(async resident => {
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

  // Test function to simulate an incoming call
  const testIncomingCall = async () => {
    if (!habitationData || !user) return;
    try {
      toast({
        title: "Création appel test...",
        description: "Attendez quelques secondes"
      });

      // Create a test call log
      const {
        data: callLog,
        error: clError
      } = await supabase.from("call_logs").insert({
        habitation_id: habitationData.id,
        status: "ringing"
      }).select().single();
      if (clError) throw clError;
      console.log("[TEST] Created call log:", callLog.id);

      // Create participant for this user with "ringing" status
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

      // Auto-end after 15 seconds
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
    return <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  if (!habitationData) {
    return <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Aucune habitation trouvée</p>
          <Button onClick={() => navigate("/register")}>Créer un ANR</Button>
        </div>
      </div>;
  }
  return <div className="min-h-screen pb-20">
      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="pt-4">
          <h1 className="font-bold text-lg text-left">Mon ANR</h1>
          <p className="text-muted-foreground pt-[10px] text-left">{habitationData.anr.address}</p>
        </div>

        {/* ANR Card */}
        <div className="glass-effect rounded-3xl p-6 card-shadow">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            {/* ANR Logo */}
            <div className="w-20 h-20 flex-shrink-0">
              <img src={logoAnr} alt="ANR" className="w-full h-full object-contain" />
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <span className="text-2xl font-mono font-bold tracking-wider">{habitationData.anr.code}</span>
                <Button variant="ghost" size="sm" onClick={copyCode}>
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-4">
                <span className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Validé
                </span>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  GPS configuré
                </span>
              </div>
              
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setShareDialogOpen(true)}>
                <Share2 className="w-4 h-4 mr-2" />
                Partager mon ANR
              </Button>
            </div>
          </div>
        </div>

        {/* Visitor Messages Section */}
        <VisitorMessagesSection habitationId={habitationData.id} />

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAction icon={<Users className="w-6 h-6" />} label="Résidents" count={habitationData.residents.length} onClick={() => navigate("/residents")} />
          <QuickAction icon={<History className="w-6 h-6" />} label="Historique" onClick={() => navigate("/call-history")} />
          <QuickAction icon={isMuted ? <BellOff className="w-6 h-6" /> : <BellRing className="w-6 h-6" />} label={isMuted ? "En sourdine" : "Notifications"} onClick={toggleMute} active={isMuted} />
          {isOwner && <QuickAction icon={<MapPin className="w-6 h-6" />} label="Position GPS" onClick={() => navigate("/update-gps")} />}
        </div>

        {/* Test Call Button (DEV) */}
        <Button onClick={testIncomingCall} className="w-full bg-orange-500 hover:bg-orange-600">
          <Phone className="w-4 h-4 mr-2" />
          🧪 Tester appel entrant
        </Button>

      </div>

      {/* Share ANR Dialog */}
      <ShareANRDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} anrCode={habitationData.anr.code} anrAddress={habitationData.anr.address} latitude={habitationData.anr.latitude} longitude={habitationData.anr.longitude} ownerName={currentUserName || "Résident"} />

      <BottomNav />
    </div>;
};
const QuickAction = ({
  icon,
  label,
  count,
  onClick,
  active
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
  active?: boolean;
}) => <button onClick={onClick} className={`glass-effect rounded-2xl p-4 flex flex-col items-center gap-2 transition-colors ${active ? "border-primary bg-primary/5" : "hover:border-primary/30"}`}>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
      {icon}
    </div>
    <span className="text-sm font-medium">{label}</span>
    {count !== undefined && <span className="text-xs text-muted-foreground">{count}</span>}
  </button>;
export default ResidentDashboard;