import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import CallHistorySection from "@/components/resident/CallHistorySection";
import BottomNav from "@/components/layout/BottomNav";

const CallHistory = () => {
  const [loading, setLoading] = useState(true);
  const [habitationId, setHabitationId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchHabitationId();
    }
  }, [user]);

  const fetchHabitationId = async () => {
    try {
      const { data, error } = await supabase
        .from("residents")
        .select("habitation_id")
        .eq("user_id", user?.id)
        .eq("status", "verified")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        navigate("/dashboard");
        return;
      }

      setHabitationId(data.habitation_id);
    } catch (error) {
      console.error("[CallHistory] Error:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
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
          <div>
            <h1 className="text-xl font-bold">Historique des appels</h1>
            <p className="text-sm text-muted-foreground">20 derniers appels</p>
          </div>
        </div>

        {/* Call History */}
        {habitationId && (
          <div className="glass-effect rounded-2xl p-4 card-shadow">
            <CallHistorySection habitationId={habitationId} />
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default CallHistory;
