import { useParams, useSearchParams, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import CallInterface from "@/components/call/CallInterface";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

interface CallData {
  address: string;
  habitationId: string;
  habitationName: string;
  callLogId: string;
  anrId: string;
  anrCode: string;
}

const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

const Call = () => {
  const { anrId } = useParams<{ anrId: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useAuth();
  const isResident = searchParams.get("resident") === "true";
  
  const [callData, setCallData] = useState<CallData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const visitorLat = location.state?.visitorLat;
  const visitorLon = location.state?.visitorLon;
  const selectedHabitationId = location.state?.habitationId;

  useEffect(() => {
    const initializeCall = async () => {
      if (!anrId) {
        setError("Code manquant");
        setLoading(false);
        return;
      }

      try {
        // RESIDENT: anrId is a call_log UUID
        if (isUUID(anrId) && isResident) {
          logger.log("[Call] Resident joining call:", anrId);
          
          // OPTIMISÉ: Requêtes parallèles
          const [callLogResult, habitationPromise] = await Promise.all([
            supabase
              .from("call_logs")
              .select("id, habitation_id, status")
              .eq("id", anrId)
              .single(),
            // On récupère l'habitation après avoir le callLog
            null,
          ]);

          const { data: callLog, error: clError } = callLogResult;
          if (clError || !callLog) {
            setError("Appel non trouvé");
            setLoading(false);
            return;
          }

          if (callLog.status === "ended") {
            setError("Cet appel est terminé");
            setLoading(false);
            return;
          }

          // Récupérer habitation et update en parallèle
          const [habitationResult] = await Promise.all([
            supabase
              .from("habitations")
              .select("id, name, anr_id, anrs(id, code, address)")
              .eq("id", callLog.habitation_id)
              .single(),
            supabase
              .from("call_logs")
              .update({ status: "answered", answered_at: new Date().toISOString(), answered_by: user?.id })
              .eq("id", anrId),
          ]);

          const { data: habitation } = habitationResult;
          if (!habitation) {
            setError("Habitation non trouvée");
            setLoading(false);
            return;
          }

          const anrData = habitation.anrs as any;
          setCallData({
            address: anrData?.address || "",
            habitationId: habitation.id,
            habitationName: habitation.name,
            callLogId: callLog.id,
            anrId: anrData?.id || habitation.anr_id || "",
            anrCode: anrData?.code || "",
          });
          setLoading(false);
          return;
        }

        // VISITOR: anrId is an ANR code
        logger.log("[Call] Visitor initiating call to ANR:", anrId);

        const { data: anr, error: anrError } = await supabase
          .from("anrs")
          .select("id, code, address")
          .ilike("code", anrId)
          .maybeSingle();

        if (anrError) throw anrError;
        if (!anr) {
          setError("ANR non trouvé");
          setLoading(false);
          return;
        }

        // Récupérer habitation
        let habitation;
        if (selectedHabitationId) {
          const { data } = await supabase
            .from("habitations")
            .select("id, name")
            .eq("id", selectedHabitationId)
            .single();
          habitation = data;
        } else {
          const { data } = await supabase
            .from("habitations")
            .select("id, name")
            .eq("anr_id", anr.id)
            .limit(1)
            .maybeSingle();
          habitation = data;
        }

        if (!habitation) {
          setError("Aucune habitation pour cet ANR");
          setLoading(false);
          return;
        }

        // Créer call log
        const { data: callLog, error: callLogError } = await supabase
          .from("call_logs")
          .insert({
            habitation_id: habitation.id,
            visitor_latitude: visitorLat || null,
            visitor_longitude: visitorLon || null,
            status: "ringing",
          })
          .select()
          .single();

        if (callLogError) throw callLogError;
        logger.log("[Call] Created call log:", callLog.id);

        // OPTIMISÉ: Récupérer résidents et créer participants en parallèle si possible
        const { data: residents } = await supabase
          .from("residents")
          .select("user_id")
          .eq("habitation_id", habitation.id)
          .eq("status", "verified");

        // Créer les participants et envoyer les notifications en parallèle
        if (residents && residents.length > 0) {
          const residentsToNotify = user?.id 
            ? residents.filter(r => r.user_id !== user.id)
            : residents;

          if (residentsToNotify.length > 0) {
            const participantsToInsert = residentsToNotify.map(r => ({
              call_id: callLog.id,
              user_id: r.user_id,
              habitation_id: habitation.id,
              role: "resident",
              status: "ringing",
            }));

            // OPTIMISÉ: Insert + Push en parallèle
            const userIds = residentsToNotify.map(r => r.user_id);
            await Promise.all([
              supabase.from("call_participants").insert(participantsToInsert),
              supabase.functions.invoke("send-push-notification", {
                body: {
                  user_ids: userIds,
                  title: "📞 Appel entrant",
                  body: `Visiteur à ${anr.address}`,
                  data: {
                    type: "incoming_call",
                    callId: callLog.id,
                    habitationId: habitation.id,
                  },
                },
              }).catch(e => logger.error("[Call] Push error:", e)),
            ]);
          }
        }

        // Créer visiteur participant
        await supabase.from("call_participants").insert({
          call_id: callLog.id,
          user_id: null,
          habitation_id: habitation.id,
          role: "visitor",
          status: "answered",
          joined_at: new Date().toISOString(),
        });
        logger.log("[Call] All participants created");

        setCallData({
          address: anr.address,
          habitationId: habitation.id,
          habitationName: habitation.name,
          callLogId: callLog.id,
          anrId: anr.id,
          anrCode: anr.code,
        });

      } catch (err: any) {
        logger.error("[Call] Error:", err);
        setError(err.message || "Erreur");
      } finally {
        setLoading(false);
      }
    };

    initializeCall();
  }, [anrId, isResident, visitorLat, visitorLon, selectedHabitationId, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !callData) {
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

  return (
    <CallInterface 
      isResident={isResident} 
      callerName={isResident ? "Visiteur" : callData.habitationName}
      anrAddress={callData.address}
      callId={callData.callLogId}
      habitationId={callData.habitationId}
      userId={user?.id}
      anrId={callData.anrId}
      anrCode={callData.anrCode}
    />
  );
};

export default Call;
