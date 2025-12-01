import { useState, useEffect } from "react";
import { Users, History, Bell, Shield, MapPin, Copy, Check, Loader2, UserPlus, Phone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import InviteResidentDialog from "./InviteResidentDialog";
import BottomNav from "@/components/layout/BottomNav";
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
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchHabitationData();
    }
  }, [user]);

  const fetchHabitationData = async () => {
    try {
      // Get user's resident record
      const { data: residentData, error: residentError } = await supabase
        .from("residents")
        .select(`
          id,
          habitation_id,
          is_owner
        `)
        .eq("user_id", user?.id)
        .eq("status", "verified")
        .maybeSingle();

      if (residentError) throw residentError;

      if (!residentData) {
        // User has no habitation, redirect to register
        navigate("/register");
        return;
      }

      setIsOwner(residentData.is_owner || false);

      // Get habitation with ANR and all residents
      const { data: habitation, error: habError } = await supabase
        .from("habitations")
        .select(`
          id,
          name,
          anrs (
            id,
            code,
            address,
            latitude,
            longitude
          )
        `)
        .eq("id", residentData.habitation_id)
        .single();

      if (habError) throw habError;

      // Get all residents of this habitation with their profiles
      const { data: residents, error: resError } = await supabase
        .from("residents")
        .select(`
          id,
          user_id,
          is_owner,
          is_muted
        `)
        .eq("habitation_id", residentData.habitation_id)
        .eq("status", "verified");

      if (resError) throw resError;

      // Fetch profiles for each resident
      const residentsWithProfiles: Resident[] = await Promise.all(
        (residents || []).map(async (resident) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name, phone_number")
            .eq("id", resident.user_id)
            .single();

          return {
            ...resident,
            profile: profile || undefined,
          };
        })
      );

      setHabitationData({
        id: habitation.id,
        name: habitation.name,
        anr: habitation.anrs as any,
        residents: residentsWithProfiles,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger les données",
        variant: "destructive",
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

  const handleDeleteResident = async (residentId: string, residentName: string) => {
    if (!confirm(`Voulez-vous vraiment retirer ${residentName} de l'habitation ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("residents")
        .delete()
        .eq("id", residentId);

      if (error) throw error;

      toast({
        title: "Résident retiré",
        description: `${residentName} a été retiré de l'habitation`,
      });
      fetchHabitationData();
    } catch (error: any) {
      console.error("[Dashboard] Delete resident error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de retirer le résident",
        variant: "destructive",
      });
    }
  };

  // Test function to simulate an incoming call
  const testIncomingCall = async () => {
    if (!habitationData || !user) return;
    
    try {
      toast({ title: "Création appel test...", description: "Attendez quelques secondes" });
      
      // Create a test call log
      const { data: callLog, error: clError } = await supabase
        .from("call_logs")
        .insert({
          habitation_id: habitationData.id,
          status: "ringing",
        })
        .select()
        .single();
      
      if (clError) throw clError;
      
      console.log("[TEST] Created call log:", callLog.id);
      
      // Create participant for this user with "ringing" status
      const { error: pError } = await supabase
        .from("call_participants")
        .insert({
          call_id: callLog.id,
          user_id: user.id,
          habitation_id: habitationData.id,
          role: "resident",
          status: "ringing",
        });
      
      if (pError) throw pError;
      
      console.log("[TEST] Created participant for user:", user.id);
      toast({ title: "Appel test créé!", description: "L'appel devrait s'afficher maintenant" });
      
      // Auto-end after 15 seconds
      setTimeout(async () => {
        await supabase
          .from("call_logs")
          .update({ status: "ended", ended_at: new Date().toISOString() })
          .eq("id", callLog.id);
        console.log("[TEST] Auto-ended test call");
      }, 15000);
      
    } catch (error: any) {
      console.error("[TEST] Error:", error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!habitationData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Aucune habitation trouvée</p>
          <Button onClick={() => navigate("/register")}>Créer un ANR</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="pt-4">
          <h1 className="text-2xl font-bold">Mon ANR</h1>
          <p className="text-muted-foreground">{habitationData.anr.address}</p>
        </div>

        {/* ANR Card */}
        <div className="glass-effect rounded-3xl p-6 card-shadow">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            {/* ANR Logo */}
            <div className="w-20 h-20 flex-shrink-0">
              <img 
                src={logoAnr} 
                alt="ANR" 
                className="w-full h-full object-contain"
              />
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
              
              <p className="text-sm text-muted-foreground">
                Partagez ce code avec vos visiteurs ou commandez votre doming officiel
              </p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAction
            icon={<Users className="w-6 h-6" />}
            label="Résidents"
            count={habitationData.residents.length}
            onClick={() => {}}
          />
          <QuickAction
            icon={<History className="w-6 h-6" />}
            label="Historique"
            onClick={() => {}}
          />
          <QuickAction
            icon={<Bell className="w-6 h-6" />}
            label="Notifications"
            onClick={() => {}}
          />
          <QuickAction
            icon={<MapPin className="w-6 h-6" />}
            label="Position GPS"
            onClick={() => {}}
          />
        </div>

        {/* Test Call Button (DEV) */}
        <Button 
          onClick={testIncomingCall}
          className="w-full bg-orange-500 hover:bg-orange-600"
        >
          <Phone className="w-4 h-4 mr-2" />
          🧪 Tester appel entrant
        </Button>

        {/* Residents list */}
        <div className="glass-effect rounded-2xl p-6 card-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Résidents ({habitationData.residents.length}/7)</h2>
            {isOwner && (
              <Button 
                variant="outline" 
                size="sm" 
                disabled={habitationData.residents.length >= 7}
                onClick={() => setInviteDialogOpen(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Inviter
              </Button>
            )}
          </div>
          
          <div className="space-y-3">
            {habitationData.residents.map((resident) => {
              const name = resident.profile 
                ? `${resident.profile.first_name || ""} ${resident.profile.last_name || ""}`.trim() || "Sans nom"
                : "Sans nom";
              const phone = resident.profile?.phone_number || "N/A";
              const canDelete = isOwner && !resident.is_owner && resident.user_id !== user?.id;
              
              return (
                <div
                  key={resident.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="font-semibold text-primary">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{name}</p>
                      <p className="text-sm text-muted-foreground">{phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {resident.is_owner && (
                      <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                        Propriétaire
                      </span>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteResident(resident.id, name)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Invite Resident Dialog */}
      <InviteResidentDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        habitationId={habitationData.id}
        habitationName={habitationData.name}
        anrAddress={habitationData.anr.address}
        onInvitationSent={fetchHabitationData}
      />

      <BottomNav />
    </div>
  );
};

const QuickAction = ({
  icon,
  label,
  count,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="glass-effect rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-primary/30 transition-colors"
  >
    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
      {icon}
    </div>
    <span className="text-sm font-medium">{label}</span>
    {count !== undefined && (
      <span className="text-xs text-muted-foreground">{count}</span>
    )}
  </button>
);

export default ResidentDashboard;
