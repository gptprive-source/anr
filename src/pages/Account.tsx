import { useState, useEffect } from "react";
import { LogOut, User, Mail, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/layout/BottomNav";

interface ProfileData {
  first_name: string | null;
  last_name: string | null;
}

const Account = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
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
        </div>

        {/* Actions */}
        <div className="pt-4">
          <Button 
            variant="destructive" 
            className="w-full gap-2" 
            onClick={handleSignOut}
          >
            <LogOut className="w-5 h-5" />
            Se déconnecter
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Account;
