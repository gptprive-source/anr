import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import ResidentDashboard from "@/components/resident/ResidentDashboard";
import BottomNav from "@/components/layout/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useBusinessCardRequired } from "@/hooks/useBusinessCardRequired";

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isRecoveringPayment, setIsRecoveringPayment] = useState(false);
  const { isComplete: cardComplete, isLoading: cardLoading, userType } = useBusinessCardRequired();

  // Redirect to onboarding if business card not complete (for residents only)
  // Visitors without resident status should go to no-habitation
  useEffect(() => {
    if (cardLoading || authLoading || !user) return;
    
    console.log("[Dashboard] Card check:", { cardComplete, userType, cardLoading });
    
    if (userType === "visitor") {
      // User has no resident/company - redirect to no-habitation
      navigate("/no-habitation", { replace: true });
      return;
    }
    
    if (!cardComplete) {
      // User has resident/company but no business card - redirect to onboarding
      navigate("/onboarding/business-card", { replace: true });
    }
  }, [cardLoading, authLoading, cardComplete, userType, user, navigate]);

  // Check for pending payment that wasn't processed
  useEffect(() => {
    if (authLoading || !user) return;

    const checkPendingPayment = async () => {
      const pendingSessionId = localStorage.getItem("anr_pending_session_id");
      
      if (!pendingSessionId) return;

      console.log("[Dashboard] Found pending session ID:", pendingSessionId);
      
      // First check if user already has a resident (payment was processed)
      const { data: resident } = await supabase
        .from("residents")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (resident) {
        console.log("[Dashboard] User already has resident, clearing pending session");
        localStorage.removeItem("anr_pending_session_id");
        return;
      }

      // User doesn't have resident but has pending session - try to recover
      console.log("[Dashboard] User has no resident, attempting payment recovery");
      setIsRecoveringPayment(true);

      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { sessionId: pendingSessionId }
        });

        console.log("[Dashboard] Payment recovery response:", { data, error });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        // Clear the pending session
        localStorage.removeItem("anr_pending_session_id");
        localStorage.removeItem("anr_register_address_data");
        localStorage.removeItem("anr_register_step");

        toast({
          title: data.alreadyProcessed ? "Paiement récupéré" : "Inscription finalisée !",
          description: "Votre compte est maintenant actif."
        });

        // Refresh the page to load resident data
        window.location.reload();
      } catch (error: any) {
        console.error("[Dashboard] Payment recovery failed:", error);
        
        // Only show error if it's not "already processed" or similar
        if (!error.message?.includes("already") && !error.message?.includes("exists")) {
          toast({
            title: "Erreur de récupération",
            description: "Veuillez contacter le support avec votre numéro de session: " + pendingSessionId,
            variant: "destructive"
          });
        }
      } finally {
        setIsRecoveringPayment(false);
      }
    };

    checkPendingPayment();
  }, [user, authLoading, toast]);

  if (isRecoveringPayment || cardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">
          {isRecoveringPayment ? "Récupération du paiement en cours..." : "Chargement..."}
        </p>
      </div>
    );
  }

  return (
    <>
      <ResidentDashboard />
      <BottomNav />
    </>
  );
};

export default Dashboard;