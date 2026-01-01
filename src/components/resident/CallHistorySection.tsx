import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, PhoneOff, PhoneIncoming, PhoneMissed, Clock, Loader2, MapPin, User, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";

interface CallLog {
  id: string;
  status: string | null;
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  answered_by: string | null;
  visitor_phone: string | null;
  answeredByName?: string;
  anrCode?: string;
  anrAddress?: string;
}

interface CallHistorySectionProps {
  habitationId: string;
}

const CallHistorySection = ({ habitationId }: CallHistorySectionProps) => {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCallHistory();
  }, [habitationId]);

  const fetchCallHistory = async () => {
    try {
      // Fetch calls with habitation and ANR info
      const { data, error } = await supabase
        .from("call_logs")
        .select(`
          *,
          habitations:habitation_id (
            name,
            anrs:anr_id (
              code,
              address
            )
          )
        `)
        .eq("habitation_id", habitationId)
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch answered_by names
      const callsWithDetails = await Promise.all(
        (data || []).map(async (call: any) => {
          let answeredByName = "";
          
          if (call.answered_by) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("first_name, last_name")
              .eq("id", call.answered_by)
              .single();
            
            answeredByName = profile 
              ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Inconnu"
              : "Inconnu";
          }

          return {
            ...call,
            answeredByName,
            anrCode: call.habitations?.anrs?.code || "",
            anrAddress: call.habitations?.anrs?.address || "",
          };
        })
      );

      setCalls(callsWithDetails);
    } catch (error) {
      console.error("[CallHistory] Error fetching:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCallIcon = (status: string | null) => {
    switch (status) {
      case "answered":
      case "ended":
        return <PhoneIncoming className="w-4 h-4 text-green-500" />;
      case "missed":
      case "declined":
        return <PhoneMissed className="w-4 h-4 text-destructive" />;
      case "ringing":
        return <Phone className="w-4 h-4 text-yellow-500 animate-pulse" />;
      default:
        return <PhoneOff className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getCallStatusLabel = (call: CallLog) => {
    switch (call.status) {
      case "answered":
      case "ended":
        if (call.answered_by) {
          return `Répondu par ${call.answeredByName || "Inconnu"}`;
        }
        return "Terminé";
      case "missed":
        return "Manqué";
      case "declined":
        return "Refusé";
      case "ringing":
        return "En cours...";
      default:
        return call.status || "Inconnu";
    }
  };

  const formatCallDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      return format(new Date(dateStr), "EEEE dd MMM yyyy 'à' HH:mm", { locale: fr });
    } catch {
      return "";
    }
  };

  const getCallDuration = (call: CallLog) => {
    if (!call.answered_at || !call.ended_at) return null;
    try {
      const start = new Date(call.answered_at).getTime();
      const end = new Date(call.ended_at).getTime();
      const durationSec = Math.floor((end - start) / 1000);
      const min = Math.floor(durationSec / 60);
      const sec = durationSec % 60;
      return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Aucun appel reçu</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {calls.map((call) => {
        const duration = getCallDuration(call);
        const isAnswered = call.status === "answered" || call.status === "ended";
        const isMissed = call.status === "missed" || call.status === "declined";
        
        return (
          <div
            key={call.id}
            className={`p-4 rounded-xl border bg-card shadow-sm ${
              isAnswered ? "border-green-500/30" : isMissed ? "border-destructive/30" : "border-border"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                isAnswered ? "bg-green-500/10" : isMissed ? "bg-destructive/10" : "bg-muted"
              }`}>
                {getCallIcon(call.status)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm text-foreground">
                    {getCallStatusLabel(call)}
                  </p>
                  {duration && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {duration}
                    </div>
                  )}
                </div>
                
                {/* ANR Info */}
                {call.anrCode && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-primary">
                    <MapPin className="w-3 h-3" />
                    <span className="font-medium">ANR: {call.anrCode}</span>
                  </div>
                )}
                
                {/* Visitor Phone */}
                {call.visitor_phone && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <User className="w-3 h-3" />
                    <span>Appelant: {call.visitor_phone}</span>
                  </div>
                )}
                
                {/* Date */}
                <p className="text-xs text-muted-foreground mt-2">
                  {formatCallDate(call.started_at)}
                </p>
                
                {/* Message Button */}
                {call.visitor_phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => navigate(`/visitor-conversation/${habitationId}__residence`)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Envoyer un message
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CallHistorySection;
