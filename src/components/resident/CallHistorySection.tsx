import { useState, useEffect } from "react";
import { Phone, PhoneOff, PhoneIncoming, PhoneMissed, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CallLog {
  id: string;
  status: string | null;
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  answered_by: string | null;
  answeredByName?: string;
}

interface CallHistorySectionProps {
  habitationId: string;
}

const CallHistorySection = ({ habitationId }: CallHistorySectionProps) => {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCallHistory();
  }, [habitationId]);

  const fetchCallHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("call_logs")
        .select("*")
        .eq("habitation_id", habitationId)
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch answered_by names
      const callsWithNames = await Promise.all(
        (data || []).map(async (call) => {
          if (call.answered_by) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("first_name, last_name")
              .eq("id", call.answered_by)
              .single();
            
            return {
              ...call,
              answeredByName: profile 
                ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Inconnu"
                : "Inconnu",
            };
          }
          return call;
        })
      );

      setCalls(callsWithNames);
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
        return <PhoneIncoming className="w-4 h-4 text-success" />;
      case "missed":
      case "declined":
        return <PhoneMissed className="w-4 h-4 text-destructive" />;
      case "ringing":
        return <Phone className="w-4 h-4 text-warning animate-pulse" />;
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

  const formatCallTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      return format(new Date(dateStr), "dd MMM à HH:mm", { locale: fr });
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

  const colorCycle = [
    { border: "border-blue-500", bg: "bg-blue-500/10", text: "text-blue-500" },
    { border: "border-orange-500", bg: "bg-orange-500/10", text: "text-orange-500" },
    { border: "border-purple-500", bg: "bg-purple-500/10", text: "text-purple-500" },
    { border: "border-pink-500", bg: "bg-pink-500/10", text: "text-pink-500" },
    { border: "border-green-500", bg: "bg-green-500/10", text: "text-green-500" },
    { border: "border-cyan-500", bg: "bg-cyan-500/10", text: "text-cyan-500" },
  ];

  return (
    <div className="space-y-2">
      {calls.map((call, index) => {
        const duration = getCallDuration(call);
        const colorSet = colorCycle[index % colorCycle.length];
        return (
          <div
            key={call.id}
            className={`flex items-center justify-between p-3 rounded-xl border ${colorSet.border}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${colorSet.bg} flex items-center justify-center`}>
                {getCallIcon(call.status)}
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">{getCallStatusLabel(call)}</p>
                <p className="text-xs text-foreground/70">
                  {formatCallTime(call.started_at)}
                </p>
              </div>
            </div>
            {duration && (
              <div className="flex items-center gap-1 text-xs text-foreground/70">
                <Clock className="w-3 h-3" />
                {duration}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CallHistorySection;
