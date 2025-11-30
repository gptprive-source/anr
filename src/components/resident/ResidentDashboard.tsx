import { useState, useEffect } from "react";
import { Users, History, Bell, Shield, MapPin, Copy, Check, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AddResidentDialog from "./AddResidentDialog";
import BottomNav from "@/components/layout/BottomNav";
import IncomingCallListener from "./IncomingCallListener";
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
  const [addResidentOpen, setAddResidentOpen] = useState(false);
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
      <IncomingCallListener />
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
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
              <img 
                src={logoAnr} 
                alt="ANR" 
                className="w-full h-full object-cover"
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

        {/* Residents list */}
        <div className="glass-effect rounded-2xl p-6 card-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Résidents ({habitationData.residents.length}/5)</h2>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={habitationData.residents.length >= 5}
              onClick={() => setAddResidentOpen(true)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </div>
          
          <div className="space-y-3">
            {habitationData.residents.map((resident) => {
              const name = resident.profile 
                ? `${resident.profile.first_name || ""} ${resident.profile.last_name || ""}`.trim() || "Sans nom"
                : "Sans nom";
              const phone = resident.profile?.phone_number || "N/A";
              
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
                  {resident.is_owner && (
                    <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                      Propriétaire
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Add Resident Dialog */}
      <AddResidentDialog
        open={addResidentOpen}
        onOpenChange={setAddResidentOpen}
        habitationId={habitationData.id}
        onResidentAdded={fetchHabitationData}
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
