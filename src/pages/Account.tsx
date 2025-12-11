import { useState, useEffect } from "react";
import { LogOut, User, Mail, Phone, ChevronRight, Loader2, Trash2, CreditCard, Calendar, ExternalLink, MapPin, Home, Shield, Download, FileText, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import BottomNav from "@/components/layout/BottomNav";
import DeleteAccountDialog from "@/components/account/DeleteAccountDialog";
import ChangeAddressDialog from "@/components/account/ChangeAddressDialog";
import RGPDRequestDialog from "@/components/account/RGPDRequestDialog";
import VisitorModeSection from "@/components/account/VisitorModeSection";
import LeaveHabitationDialog from "@/components/account/LeaveHabitationDialog";
import GrantedAccessSection from "@/components/resident/GrantedAccessSection";
import ChangePlanDialog from "@/components/account/ChangePlanDialog";
import ChangeEmailDialog from "@/components/account/ChangeEmailDialog";
import ChangePhoneDialog from "@/components/account/ChangePhoneDialog";
interface ProfileData {
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
}
interface SubscriptionData {
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  plan_type?: string;
}
interface HabitationData {
  id: string;
  name: string;
  anr_address: string;
  is_owner: boolean;
}
const Account = () => {
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [habitation, setHabitation] = useState<HabitationData | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showChangeAddressDialog, setShowChangeAddressDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showRGPDDialog, setShowRGPDDialog] = useState(false);
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [showChangeEmailDialog, setShowChangeEmailDialog] = useState(false);
  const [showChangePhoneDialog, setShowChangePhoneDialog] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    user,
    signOut
  } = useAuth();
  const {
    isAdmin
  } = useAdminAuth();
  const {
    toast
  } = useToast();

  // Handle plan change success
  useEffect(() => {
    const handlePlanChangeSuccess = async () => {
      const planChanged = searchParams.get("plan_changed");
      const sessionId = searchParams.get("session_id");
      const newPlan = searchParams.get("new_plan");

      if (planChanged === "success" && sessionId) {
        try {
          const { error } = await supabase.functions.invoke("verify-plan-change", {
            body: { sessionId }
          });

          if (error) {
            console.error("Error verifying plan change:", error);
            sonnerToast.error("Erreur lors de la vérification du changement de plan");
          } else {
            sonnerToast.success(`Votre abonnement a été mis à jour vers le plan ${newPlan?.charAt(0).toUpperCase()}${newPlan?.slice(1)} !`);
          }
        } catch (err) {
          console.error("Plan change verification error:", err);
        }

        // Clear URL params
        setSearchParams({});
        // Refresh data
        if (user) fetchData();
      } else if (planChanged === "cancelled") {
        sonnerToast.info("Changement de plan annulé");
        setSearchParams({});
      }
    };

    handlePlanChangeSuccess();
  }, [searchParams, user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);
  const fetchData = async () => {
    try {
      // Fetch profile
      const {
        data: profileData,
        error: profileError
      } = await supabase.from("profiles").select("first_name, last_name, phone_number").eq("id", user?.id).single();
      if (profileError) throw profileError;
      setProfile(profileData);
      setPhoneNumber(profileData.phone_number || "");

      // Fetch subscription
      const {
        data: subData
      } = await supabase.from("subscriptions").select("status, current_period_end, cancel_at_period_end, plan_type").eq("user_id", user?.id).order("created_at", {
        ascending: false
      }).limit(1).maybeSingle();
      setSubscription(subData);

      // Fetch habitation
      const {
        data: residentData
      } = await supabase.from("residents").select(`
          is_owner,
          habitation:habitations (
            id,
            name,
            anr:anrs (address)
          )
        `).eq("user_id", user?.id).eq("status", "verified").maybeSingle();
      if (residentData?.habitation) {
        const hab = residentData.habitation as any;
        setHabitation({
          id: hab.id,
          name: hab.name,
          anr_address: hab.anr?.address || "",
          is_owner: residentData.is_owner || false
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-user-data");
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data.userData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mes-donnees-anr-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export réussi",
        description: "Vos données ont été téléchargées"
      });
    } catch (error: any) {
      console.error("Error exporting data:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'exporter vos données",
        variant: "destructive"
      });
    } finally {
      setExportLoading(false);
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center pb-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  const fullName = profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Utilisateur" : "Utilisateur";
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };
  const getSubscriptionStatus = () => {
    if (!subscription) return {
      label: "Aucun abonnement",
      color: "text-muted-foreground"
    };
    switch (subscription.status) {
      case "active":
        return subscription.cancel_at_period_end ? {
          label: "Annulé (actif jusqu'au terme)",
          color: "text-warning"
        } : {
          label: "Actif",
          color: "text-success"
        };
      case "past_due":
        return {
          label: "Paiement en retard",
          color: "text-destructive"
        };
      case "canceled":
        return {
          label: "Annulé",
          color: "text-destructive"
        };
      default:
        return {
          label: subscription.status,
          color: "text-muted-foreground"
        };
    }
  };
  const statusInfo = getSubscriptionStatus();
  return <div className="min-h-screen pb-20">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="pt-4">
          <h1 className="text-2xl font-bold">Mon compte Interphone</h1>
        </div>

        {/* Profile card - full width */}
        <div className="bg-background/50 rounded-2xl p-6 card-shadow border border-blue-500">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
              <User className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{fullName}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Grid layout - 2 columns on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Subscription section */}
          {subscription && <div className="bg-background/50 rounded-2xl p-4 card-shadow space-y-4 border border-green-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Abonnement ANR</p>
                  <p className={`text-sm ${statusInfo.color}`}>{statusInfo.label}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pl-13">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {subscription.cancel_at_period_end ? "Fin le" : "Prochain renouvellement :"}{" "}
                  <span className="font-medium text-foreground">
                    {formatDate(subscription.current_period_end)}
                  </span>
                </p>
              </div>

              <Button variant="outline" className="w-full gap-2" onClick={() => setShowChangePlanDialog(true)}>
                <ExternalLink className="w-4 h-4" />
                Gérer mon abonnement
              </Button>
            </div>}

          {/* Habitation section */}
          {habitation && <div className="bg-background/50 rounded-2xl p-4 card-shadow space-y-4 border border-orange-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Home className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{habitation.name}</p>
                  <p className="text-sm text-muted-foreground">{habitation.is_owner ? "Propriétaire" : "Résident invité"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 pl-13">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">{habitation.anr_address}</p>
              </div>

              <div className="flex gap-2">
                {habitation.is_owner ? <Button variant="outline" className="flex-1 gap-2" onClick={() => setShowChangeAddressDialog(true)}>
                    <MapPin className="w-4 h-4" />
                    Déménager
                  </Button> : <Button variant="outline" className="flex-1 gap-2 text-destructive hover:text-destructive" onClick={() => setShowLeaveDialog(true)}>
                    <LogOut className="w-4 h-4" />
                    Quitter l'habitation
                  </Button>}
              </div>
            </div>}

          {/* Email section */}
          <div 
            className="bg-background/50 rounded-xl p-4 flex items-center justify-between border border-yellow-500 cursor-pointer hover:bg-yellow-500/5 transition-colors"
            onClick={() => setShowChangeEmailDialog(true)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>
            <Pencil className="w-5 h-5 text-yellow-500" />
          </div>

          {/* Phone number section */}
          <div 
            className="bg-background/50 rounded-xl p-4 flex items-center justify-between border border-cyan-500 cursor-pointer hover:bg-cyan-500/5 transition-colors"
            onClick={() => setShowChangePhoneDialog(true)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Numéro de téléphone</p>
                <p className="font-medium">{phoneNumber || "Non renseigné"}</p>
              </div>
            </div>
            <Pencil className="w-5 h-5 text-cyan-500" />
          </div>

          {/* Admin link */}
          {isAdmin && <Link to="/admin" className="block">
              <div className="bg-background/50 rounded-xl p-4 flex items-center justify-between border border-blue-500 hover:bg-blue-500/10 transition-colors h-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-500">Panel Admin</p>
                    <p className="text-xs text-muted-foreground">Accéder à l'administration</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-blue-500" />
              </div>
            </Link>}

          {/* RGPD section */}
          <div className="bg-background/50 rounded-xl p-4 space-y-3 border border-rose-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-rose-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Mes droits RGPD</p>
                <p className="text-xs text-muted-foreground">Protection de vos données personnelles</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                className="gap-2" 
                onClick={handleExportData}
                disabled={exportLoading}
              >
                {exportLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Exporter
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => setShowRGPDDialog(true)}
              >
                <FileText className="w-4 h-4" />
                Demande RGPD
              </Button>
            </div>
          </div>
        </div>

        {/* Granted Access Section - full width */}
        <GrantedAccessSection />

        {/* Visitor Mode Section - full width */}
        <VisitorModeSection 
          userProfile={profile}
          userEmail={user?.email}
        />

        {/* Actions - full width */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button variant="outline" className="w-full gap-2" onClick={handleSignOut}>
            <LogOut className="w-5 h-5" />
            Se déconnecter
          </Button>

          <Button variant="destructive" className="w-full gap-2" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="w-5 h-5" />
            Supprimer mon compte
          </Button>
        </div>
      </div>

      <DeleteAccountDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} profile={profile} />

      <ChangeAddressDialog open={showChangeAddressDialog} onOpenChange={setShowChangeAddressDialog} currentAddress={habitation?.anr_address} onAddressChanged={fetchData} />

      <LeaveHabitationDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog} habitationName={habitation?.name} onLeft={() => {
      setHabitation(null);
      fetchData();
    }} />

      <RGPDRequestDialog open={showRGPDDialog} onOpenChange={setShowRGPDDialog} />

      <ChangePlanDialog open={showChangePlanDialog} onOpenChange={setShowChangePlanDialog} />

      <ChangeEmailDialog open={showChangeEmailDialog} onOpenChange={setShowChangeEmailDialog} currentEmail={user?.email} />

      <ChangePhoneDialog open={showChangePhoneDialog} onOpenChange={setShowChangePhoneDialog} currentPhone={phoneNumber} onPhoneChanged={fetchData} />

      <BottomNav />
    </div>;
};
export default Account;