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
    <div className="min-h-screen pb-20 bg-background">
      {/* Blue Header */}
      <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Historique des appels</h1>
            <p className="text-sm text-primary-foreground/70">20 derniers appels</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">

        {habitationId && (
          <div className="bg-card rounded-2xl p-4 card-shadow">
            <CallHistorySection habitationId={habitationId} />
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default CallHistory;
