import { useState, useEffect } from "react";
import {
  LogOut,
  User,
  Mail,
  Phone,
  ChevronRight,
  Loader2,
  Trash2,
  CreditCard,
  Calendar,
  ExternalLink,
  MapPin,
  Home,
  Shield,
  Download,
  FileText,
  Pencil,
  Lock,
  Gift,
  ArrowLeft,
  Receipt,
  Users,
} from "lucide-react";
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
// VisitorModeSection removed - replaced by mandatory onboarding flow
import LeaveHabitationDialog from "@/components/account/LeaveHabitationDialog";
import GrantedAccessSection from "@/components/resident/GrantedAccessSection";
import ConnectedDevices from "@/components/account/ConnectedDevices";
import ChangePlanDialog from "@/components/account/ChangePlanDialog";
import ChangeEmailDialog from "@/components/account/ChangeEmailDialog";
import ChangePhoneDialog from "@/components/account/ChangePhoneDialog";

import { RingtoneSettingsCard } from "@/components/account/RingtoneSettingsCard";
import { Card } from "@/components/ui/card";
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
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminAuth();
  const { toast } = useToast();

  // Handle plan change success
  useEffect(() => {
    const handlePlanChangeSuccess = async () => {
      const planChanged = searchParams.get("plan_changed");
      const sessionId = searchParams.get("session_id");
      const newPlan = searchParams.get("new_plan");
      if (planChanged === "success" && sessionId) {
        try {
          const { error } = await supabase.functions.invoke("verify-plan-change", {
            body: {
              sessionId,
            },
          });
          if (error) {
            console.error("Error verifying plan change:", error);
            sonnerToast.error("Erreur lors de la vérification du changement de plan");
          } else {
            sonnerToast.success(
              `Votre abonnement a été mis à jour vers le plan ${newPlan?.charAt(0).toUpperCase()}${newPlan?.slice(1)} !`,
            );
          }
        } catch (err) {
          console.error("Plan change verification error:", err);
        }
        setSearchParams({});
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
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name, phone_number")
        .eq("id", user?.id)
        .single();
      if (profileError) throw profileError;
      setProfile(profileData);
      setPhoneNumber(profileData.phone_number || "");
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("status, current_period_end, cancel_at_period_end, plan_type")
        .eq("user_id", user?.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();
      setSubscription(subData);
      const { data: residentData } = await supabase
        .from("residents")
        .select(
          `
          is_owner,
          habitation:habitations (
            id,
            name,
            anr:anrs (address)
          )
        `,
        )
        .eq("user_id", user?.id)
        .eq("status", "verified")
        .maybeSingle();
      if (residentData?.habitation) {
        const hab = residentData.habitation as any;
        setHabitation({
          id: hab.id,
          name: hab.name,
          anr_address: hab.anr?.address || "",
          is_owner: residentData.is_owner || false,
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
      const response = await supabase.functions.invoke("export-user-data", {
        body: {
          format: "pdf",
        },
      });
      if (response.error) throw response.error;
      const pdfBlob = new Blob([response.data], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mes-donnees-anr-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Export réussi",
        description: "Vos données ont été téléchargées en PDF",
      });
    } catch (error: any) {
      console.error("Error exporting data:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'exporter vos données",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  const fullName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Utilisateur"
    : "Utilisateur";
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };
  const getSubscriptionStatus = () => {
    if (!subscription)
      return {
        label: "Aucun abonnement",
        color: "text-muted-foreground",
      };
    switch (subscription.status) {
      case "active":
        return subscription.cancel_at_period_end
          ? {
              label: "Annulé (actif jusqu'au terme)",
              color: "text-warning",
            }
          : {
              label: "Actif",
              color: "text-success",
            };
      case "past_due":
        return {
          label: "Paiement en retard",
          color: "text-destructive",
        };
      case "canceled":
        return {
          label: "Annulé",
          color: "text-destructive",
        };
      default:
        return {
          label: subscription.status,
          color: "text-muted-foreground",
        };
    }
  };
  const statusInfo = getSubscriptionStatus();
  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Mon compte</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Profile card */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shadow-neumorphic-inset">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{fullName}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </Card>

        {/* Grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Subscription section */}
          {subscription && (
            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shadow-neumorphic-inset">
                  <CreditCard className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Abonnement ANR</p>
                  <p className={`text-sm ${statusInfo.color}`}>{statusInfo.label}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pl-13">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {subscription.cancel_at_period_end ? "Fin le" : "Prochain renouvellement :"}{" "}
                  <span className="font-medium text-foreground">{formatDate(subscription.current_period_end)}</span>
                </p>
              </div>

              <Button variant="outline" className="w-full gap-2" onClick={() => setShowChangePlanDialog(true)}>
                <ExternalLink className="w-4 h-4" />
                Gérer mon abonnement
              </Button>
            </Card>
          )}

          {/* Habitation section */}
          {habitation && (
            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shadow-neumorphic-inset">
                  <Home className="w-5 h-5 text-warning" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{habitation.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {habitation.is_owner ? "Propriétaire" : "Co-résident"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pl-13">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">{habitation.anr_address}</p>
              </div>

              <div className="flex gap-2">
                {habitation.is_owner ? (
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => setShowChangeAddressDialog(true)}>
                    <MapPin className="w-4 h-4" />
                    Déménager
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 text-destructive hover:text-destructive"
                    onClick={() => setShowLeaveDialog(true)}
                  >
                    <LogOut className="w-4 h-4" />
                    Quitter l'habitation
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Email section */}
          <Card
            className="p-4 flex items-center justify-between cursor-pointer hover:shadow-neumorphic-pressed transition-all"
            onClick={() => setShowChangeEmailDialog(true)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-neumorphic-inset">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-foreground">{user?.email}</p>
              </div>
            </div>
            <Pencil className="w-5 h-5 text-muted-foreground" />
          </Card>

          {/* Phone number section */}
          <Card
            className="p-4 flex items-center justify-between cursor-pointer hover:shadow-neumorphic-pressed transition-all"
            onClick={() => setShowChangePhoneDialog(true)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shadow-neumorphic-inset">
                <Phone className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Numéro de téléphone</p>
                <p className="font-medium text-foreground">{phoneNumber || "Non renseigné"}</p>
              </div>
            </div>
            <Pencil className="w-5 h-5 text-muted-foreground" />
          </Card>

          {/* Admin link */}
          {isAdmin && (
            <Link to="/admin" className="block">
              <Card className="p-4 flex items-center justify-between hover:shadow-neumorphic-pressed transition-all h-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-neumorphic-inset">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-primary">Panel Admin</p>
                    <p className="text-xs text-muted-foreground">Accéder à l'administration</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-primary" />
              </Card>
            </Link>
          )}

          {/* RGPD section */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shadow-neumorphic-inset">
                <Shield className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Mes droits RGPD</p>
                <p className="text-xs text-muted-foreground">Protection de vos données personnelles</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="gap-2" onClick={handleExportData} disabled={exportLoading}>
                {exportLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Exporter
                  </>
                )}
              </Button>

              <Button variant="outline" className="gap-2" onClick={() => setShowRGPDDialog(true)}>
                <FileText className="w-4 h-4" />
                Demande RGPD
              </Button>
            </div>
          </Card>

          {/* Message Backup section */}
          <Link to="/message-backup" className="block">
            <Card className="p-4 flex items-center justify-between hover:shadow-neumorphic-pressed transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-neumorphic-inset">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Sauvegarde des messages</p>
                  <p className="text-xs text-muted-foreground">Messages chiffrés E2E</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Card>
          </Link>

          {/* Visitor Business Card section */}
          <Link to="/visitor-card?edit=true" className="block">
            <Card className="p-4 flex items-center justify-between hover:shadow-neumorphic-pressed transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shadow-neumorphic-inset">
                  <CreditCard className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Ma carte de visite</p>
                  <p className="text-xs text-muted-foreground">Informations affichées aux résidents</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Card>
          </Link>

          {/* Residents section */}
          <Link to="/residents" className="block">
            <Card className="p-4 flex items-center justify-between hover:shadow-neumorphic-pressed transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shadow-neumorphic-inset">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Résidents</p>
                  <p className="text-xs text-muted-foreground">Gérer les co-résidents</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Card>
          </Link>

          <Link to="/orders" className="block">
            <Card className="p-4 flex items-center justify-between hover:shadow-neumorphic-pressed transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center shadow-neumorphic-inset">
                  <Receipt className="w-5 h-5 text-teal-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Mes commandes</p>
                  <p className="text-xs text-muted-foreground">Historique des commandes</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Card>
          </Link>

          {/* GPS Position section - only for owners */}
          {habitation?.is_owner && (
            <Link to="/update-gps" className="block">
              <Card className="p-4 flex items-center justify-between hover:shadow-neumorphic-pressed transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shadow-neumorphic-inset">
                    <MapPin className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Position GPS</p>
                    <p className="text-xs text-muted-foreground">Modifier les coordonnées de l'ANR</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Card>
            </Link>
          )}
        </div>

        {/* Granted Access Section */}
        <GrantedAccessSection />

        {/* Connected Devices Section */}
        <ConnectedDevices />

        {/* Ringtone Settings */}
        <RingtoneSettingsCard />

        {/* Danger zone */}
        <Card className="p-4 space-y-4 py-[18px] pt-[18px]">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 text-destructive hover:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4" />
              Supprimer mon compte
            </Button>
          </div>
        </Card>
      </div>

      <BottomNav />

      <DeleteAccountDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} profile={profile} />
      <ChangeAddressDialog
        open={showChangeAddressDialog}
        onOpenChange={setShowChangeAddressDialog}
        onAddressChanged={() => fetchData()}
      />
      <LeaveHabitationDialog
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
        onLeft={() => navigate("/no-habitation")}
      />
      <RGPDRequestDialog open={showRGPDDialog} onOpenChange={setShowRGPDDialog} />
      <ChangePlanDialog
        open={showChangePlanDialog}
        onOpenChange={setShowChangePlanDialog}
        currentPlan={subscription?.plan_type || "particulier"}
      />
      <ChangeEmailDialog open={showChangeEmailDialog} onOpenChange={setShowChangeEmailDialog} />
      <ChangePhoneDialog
        open={showChangePhoneDialog}
        onOpenChange={setShowChangePhoneDialog}
        currentPhone={phoneNumber}
        onPhoneChanged={() => fetchData()}
      />
    </div>
  );
};
export default Account;
