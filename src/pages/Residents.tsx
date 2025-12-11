import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import InviteResidentDialog from "@/components/resident/InviteResidentDialog";
import BottomNav from "@/components/layout/BottomNav";

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

interface HabitationInfo {
  id: string;
  name: string;
  anrAddress: string;
}

const Residents = () => {
  const [loading, setLoading] = useState(true);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [habitationInfo, setHabitationInfo] = useState<HabitationInfo | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchResidents();
    }
  }, [user]);

  const fetchResidents = async () => {
    try {
      // Get user's resident record
      const { data: residentData, error: residentError } = await supabase
        .from("residents")
        .select("habitation_id, is_owner")
        .eq("user_id", user?.id)
        .eq("status", "verified")
        .maybeSingle();

      if (residentError) throw residentError;

      if (!residentData) {
        navigate("/dashboard");
        return;
      }

      setIsOwner(residentData.is_owner || false);

      // Get habitation info
      const { data: habitation, error: habError } = await supabase
        .from("habitations")
        .select(`
          id,
          name,
          anrs (address)
        `)
        .eq("id", residentData.habitation_id)
        .single();

      if (habError) throw habError;

      setHabitationInfo({
        id: habitation.id,
        name: habitation.name,
        anrAddress: (habitation.anrs as any)?.address || "",
      });

      // Get all residents of this habitation with their profiles
      const { data: residentsData, error: resError } = await supabase
        .from("residents")
        .select("id, user_id, is_owner, is_muted")
        .eq("habitation_id", residentData.habitation_id)
        .eq("status", "verified");

      if (resError) throw resError;

      // Fetch profiles for each resident
      const residentsWithProfiles: Resident[] = await Promise.all(
        (residentsData || []).map(async (resident) => {
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

      setResidents(residentsWithProfiles);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger les résidents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResident = async (residentId: string, residentUserId: string, residentName: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer définitivement le compte de ${residentName} ?`)) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: {
          targetUserId: residentUserId,
          requestingUserId: user?.id,
          habitationId: habitationInfo?.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Compte supprimé",
        description: `Le compte de ${residentName} a été supprimé définitivement`,
      });
      fetchResidents();
    } catch (error: any) {
      console.error("[Residents] Delete error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le compte",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pt-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Résidents</h1>
            <p className="text-sm text-muted-foreground">{residents.length}/7 résidents</p>
          </div>
          {isOwner && (
            <Button 
              variant="outline" 
              size="sm" 
              disabled={residents.length >= 7}
              onClick={() => setInviteDialogOpen(true)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Inviter
            </Button>
          )}
        </div>

        {/* Residents List */}
        <div className="space-y-3">
          {residents.map((resident, index) => {
            const name = resident.profile 
              ? `${resident.profile.first_name || ""} ${resident.profile.last_name || ""}`.trim() || "Sans nom"
              : "Sans nom";
            const canDelete = isOwner && !resident.is_owner && resident.user_id !== user?.id;
            
            // Cycle through colors
            const colorCycle = [
              { border: "border-blue-500", bg: "bg-blue-500/20", text: "text-blue-500" },
              { border: "border-orange-500", bg: "bg-orange-500/20", text: "text-orange-500" },
              { border: "border-purple-500", bg: "bg-purple-500/20", text: "text-purple-500" },
              { border: "border-pink-500", bg: "bg-pink-500/20", text: "text-pink-500" },
              { border: "border-green-500", bg: "bg-green-500/20", text: "text-green-500" },
              { border: "border-cyan-500", bg: "bg-cyan-500/20", text: "text-cyan-500" },
            ];
            const colorSet = colorCycle[index % colorCycle.length];
            
            return (
              <div
                key={resident.id}
                className={`glass-effect rounded-xl p-4 card-shadow border-2 ${colorSet.border}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full ${colorSet.bg} flex items-center justify-center`}>
                      <span className={`font-semibold text-lg ${colorSet.text}`}>
                        {name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{name}</p>
                      <div className="flex items-center gap-2">
                        {resident.is_owner && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                            Propriétaire
                          </span>
                        )}
                        {resident.is_muted && (
                          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
                            En sourdine
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteResident(resident.id, resident.user_id, name)}
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

        {residents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Aucun résident trouvé
          </div>
        )}
      </div>

      {/* Invite Resident Dialog */}
      {habitationInfo && (
        <InviteResidentDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          habitationId={habitationInfo.id}
          habitationName={habitationInfo.name}
          anrAddress={habitationInfo.anrAddress}
          onInvitationSent={fetchResidents}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default Residents;
