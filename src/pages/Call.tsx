import { useParams, useSearchParams, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import CallInterface from "@/components/call/CallInterface";
import { Loader2 } from "lucide-react";

interface ANRData {
  id: string;
  code: string;
  address: string;
  habitation_name?: string;
}

const Call = () => {
  const { anrId } = useParams<{ anrId: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isResident = searchParams.get("resident") === "true";
  
  const [anrData, setAnrData] = useState<ANRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get visitor position from navigation state
  const visitorLat = location.state?.visitorLat;
  const visitorLon = location.state?.visitorLon;

  useEffect(() => {
    const fetchANRData = async () => {
      if (!anrId) {
        setError("Code ANR manquant");
        setLoading(false);
        return;
      }

      try {
        // Get ANR first
        const { data: anr, error: anrError } = await supabase
          .from("anrs")
          .select("id, code, address")
          .eq("code", anrId)
          .maybeSingle();

        if (anrError) {
          console.error("[Call] ANR error:", anrError);
          throw anrError;
        }

        if (!anr) {
          console.log("[Call] ANR not found for code:", anrId);
          setError("ANR non trouvé");
          setLoading(false);
          return;
        }

        console.log("[Call] Found ANR:", anr);

        // Get habitation name
        const { data: habitations } = await supabase
          .from("habitations")
          .select("name")
          .eq("anr_id", anr.id)
          .limit(1);

        const habitationName = habitations?.[0]?.name;
        console.log("[Call] Habitation:", habitationName);

        setAnrData({
          id: anr.id,
          code: anr.code,
          address: anr.address,
          habitation_name: habitationName,
        });
      } catch (err: any) {
        console.error("[Call] Error fetching ANR:", err);
        setError(err.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };

    fetchANRData();
  }, [anrId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !anrData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <p className="text-destructive mb-4">{error || "Erreur"}</p>
        <button 
          onClick={() => window.history.back()}
          className="text-primary hover:underline"
        >
          Retour
        </button>
      </div>
    );
  }

  // Generate a unique call ID based on ANR and timestamp
  const callId = `call-${anrData.id}-${Date.now()}`;

  return (
    <CallInterface 
      isResident={isResident} 
      callerName={isResident ? "Visiteur" : (anrData.habitation_name || "Résident")}
      anrAddress={anrData.address}
      callId={callId}
    />
  );
};

export default Call;
