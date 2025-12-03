import { useState, useEffect } from "react";
import { LogOut, User, Mail, Phone, ChevronRight, Loader2, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/layout/BottomNav";

interface ProfileData {
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
}

const Account = () => {
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, phone_number")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setPhoneNumber(data.phone_number || "");
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePhone = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ phone_number: phoneNumber.trim() || null })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Numéro enregistré",
        description: "Votre numéro de téléphone a été mis à jour",
      });
    } catch (error: any) {
      console.error("Error saving phone:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le numéro",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Voulez-vous vraiment supprimer définitivement votre compte ? Cette action est irréversible.")) {
      return;
    }

    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: {
          targetUserId: user?.id,
          requestingUserId: user?.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Compte supprimé",
        description: "Votre compte a été supprimé définitivement",
      });
      
      await signOut();
      navigate("/");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le compte",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
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

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="pt-4">
          <h1 className="text-2xl font-bold">Mon compte</h1>
        </div>

        {/* Profile card */}
        <div className="glass-effect rounded-2xl p-6 card-shadow">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{fullName}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Info sections */}
        <div className="space-y-3">
          <div className="glass-effect rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* Phone number editable */}
          <div className="glass-effect rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Numéro de téléphone</p>
            </div>
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="Ex: +33 6 12 34 56 78"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleSavePhone} 
                disabled={saving}
                size="icon"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 space-y-3">
          <Button 
            variant="outline" 
            className="w-full gap-2" 
            onClick={handleSignOut}
          >
            <LogOut className="w-5 h-5" />
            Se déconnecter
          </Button>

          <Button 
            variant="destructive" 
            className="w-full gap-2" 
            onClick={handleDeleteAccount}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Trash2 className="w-5 h-5" />
            )}
            Supprimer mon compte
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Account;
