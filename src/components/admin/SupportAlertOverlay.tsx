import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSupportAlert } from "@/contexts/SupportAlertContext";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export const SupportAlertOverlay = () => {
  const { pendingRequest, dismissAlert, markAsAnswered } = useSupportAlert();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  const vibrationIntervalRef = useRef<number | null>(null);

  // Create audio context for alert sound
  const playAlertSound = () => {
    try {
      const ctx = new AudioContext();
      const currentTime = ctx.currentTime;
      
      // Urgent notification sound (two-tone alert)
      const frequencies = [800, 600, 800, 600];
      let offset = 0;
      
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, currentTime + offset);
        gain.gain.setValueAtTime(0.4, currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, currentTime + offset + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(currentTime + offset);
        osc.stop(currentTime + offset + 0.2);
        offset += 0.2;
      });
    } catch (e) {
      console.error("[SupportAlert] Sound failed:", e);
    }
  };

  // Start alert when pending request appears
  useEffect(() => {
    if (!pendingRequest) {
      // Stop everything
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
        vibrationIntervalRef.current = null;
      }
      if (navigator.vibrate) {
        navigator.vibrate(0);
      }
      return;
    }

    // Play alert sound immediately
    playAlertSound();

    // Start vibration
    if (navigator.vibrate) {
      navigator.vibrate([300, 100, 300, 100, 300]);
      vibrationIntervalRef.current = window.setInterval(() => {
        if (navigator.vibrate) {
          navigator.vibrate([300, 100, 300, 100, 300]);
        }
      }, 3000);
    }

    // Repeat sound every 4 seconds
    intervalRef.current = window.setInterval(() => {
      playAlertSound();
    }, 4000);

    // Show browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      const notification = new Notification("🆘 Demande de support", {
        body: `${pendingRequest.userName} demande à parler au support`,
        icon: "/pwa-192x192.png",
        tag: "support-request",
        requireInteraction: true,
      });
      
      notification.onclick = () => {
        window.focus();
        navigate('/admin/support');
        notification.close();
      };
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
      }
      if (navigator.vibrate) {
        navigator.vibrate(0);
      }
    };
  }, [pendingRequest, navigate]);

  if (!pendingRequest) return null;

  const handleAnswer = () => {
    markAsAnswered(pendingRequest.id);
    navigate('/admin/support');
  };

  const timeAgo = formatDistanceToNow(new Date(pendingRequest.createdAt), {
    addSuffix: true,
    locale: fr,
  });

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      style={{ animation: "fadeIn 0.3s ease-out" }}
    >
      {/* Pulsing rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div 
          className="absolute w-64 h-64 rounded-full border-4 border-red-500/30"
          style={{ animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite" }}
        />
        <div 
          className="absolute w-48 h-48 rounded-full border-4 border-red-500/50"
          style={{ animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite 0.3s" }}
        />
        <div 
          className="absolute w-32 h-32 rounded-full border-4 border-red-500/70"
          style={{ animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite 0.6s" }}
        />
      </div>

      {/* Alert card */}
      <div 
        className="relative bg-gradient-to-br from-red-600 to-red-700 text-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
        style={{ animation: "scaleIn 0.3s ease-out" }}
      >
        {/* Close button */}
        <button
          onClick={dismissAlert}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div 
            className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center"
            style={{ animation: "pulse 1s ease-in-out infinite" }}
          >
            <MessageCircle className="w-10 h-10" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">🆘 Demande de support</h2>
          <p className="text-xl font-medium mb-1">{pendingRequest.userName}</p>
          <p className="text-white/70 text-sm">{timeAgo}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleAnswer}
            className="w-full bg-white text-red-600 hover:bg-white/90 font-bold py-6 text-lg"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            Répondre maintenant
          </Button>
          <Button
            onClick={dismissAlert}
            variant="ghost"
            className="w-full text-white/80 hover:text-white hover:bg-white/10"
          >
            Ignorer pour l'instant
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};
