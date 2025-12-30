import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VerificationStatus = "idle" | "initializing" | "calling" | "waiting" | "verified" | "expired" | "error";

interface UsePhoneVerificationReturn {
  status: VerificationStatus;
  ovhNumber: string;
  errorMessage: string | null;
  timeRemaining: number;
  isCapacitor: boolean;
  initVerification: (phoneNumber: string, deviceId: string) => Promise<boolean>;
  startPolling: () => void;
  stopPolling: () => void;
  triggerCall: () => void;
  reset: () => void;
}

export const usePhoneVerification = (): UsePhoneVerificationReturn => {
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const [ovhNumber, setOvhNumber] = useState<string>("+33185099116");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(600); // 10 minutes
  const [verificationId, setVerificationId] = useState<string | null>(null);
  
  const pollingRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const expiresAtRef = useRef<Date | null>(null);

  // Detect Capacitor (native app)
  const isCapacitor = typeof (window as any).Capacitor !== "undefined";

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (status === "waiting" || status === "calling") {
      timerRef.current = window.setInterval(() => {
        if (expiresAtRef.current) {
          const remaining = Math.max(0, Math.floor((expiresAtRef.current.getTime() - Date.now()) / 1000));
          setTimeRemaining(remaining);
          if (remaining === 0) {
            setStatus("expired");
            stopPolling();
          }
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const initVerification = useCallback(async (phoneNumber: string, deviceId: string): Promise<boolean> => {
    setStatus("initializing");
    setErrorMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMessage("Session expirée. Veuillez vous reconnecter.");
        setStatus("error");
        return false;
      }

      const response = await supabase.functions.invoke("init-phone-auth", {
        body: { phone_number: phoneNumber, device_id: deviceId },
      });

      if (response.error) {
        setErrorMessage(response.error.message || "Erreur lors de l'initialisation");
        setStatus("error");
        return false;
      }

      const data = response.data;
      if (data.error) {
        setErrorMessage(data.error);
        setStatus("error");
        return false;
      }

      setVerificationId(data.verification_id);
      setOvhNumber(data.ovh_number);
      expiresAtRef.current = new Date(data.expires_at);
      setTimeRemaining(Math.floor((expiresAtRef.current.getTime() - Date.now()) / 1000));
      setStatus("calling");
      
      return true;
    } catch (error) {
      console.error("[usePhoneVerification] Init error:", error);
      setErrorMessage("Erreur de connexion au serveur");
      setStatus("error");
      return false;
    }
  }, []);

  const checkVerification = useCallback(async () => {
    if (!verificationId || status === "verified" || status === "expired") return;

    try {
      const response = await supabase.functions.invoke("check-phone-auth", {
        body: { verification_id: verificationId },
      });

      if (response.error) {
        console.error("[usePhoneVerification] Check error:", response.error);
        return;
      }

      const data = response.data;
      
      if (data.verified) {
        setStatus("verified");
        stopPolling();
      } else if (data.status === "expired") {
        setStatus("expired");
        stopPolling();
      }
    } catch (error) {
      console.error("[usePhoneVerification] Check error:", error);
    }
  }, [verificationId, status]);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    
    setStatus("waiting");
    
    // Poll every 2 seconds
    pollingRef.current = window.setInterval(() => {
      checkVerification();
    }, 2000);
    
    // Also check immediately
    checkVerification();
  }, [checkVerification]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const triggerCall = useCallback(() => {
    const telUrl = `tel:${ovhNumber.replace(/\s/g, "")}`;
    
    if (isCapacitor) {
      // On native app, directly open phone dialer
      window.open(telUrl, "_system");
    } else {
      // On web, open tel: link
      window.location.href = telUrl;
    }
    
    // Start polling after triggering call
    setTimeout(() => {
      startPolling();
    }, 1000);
  }, [ovhNumber, isCapacitor, startPolling]);

  const reset = useCallback(() => {
    stopPolling();
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus("idle");
    setErrorMessage(null);
    setTimeRemaining(600);
    setVerificationId(null);
    expiresAtRef.current = null;
  }, [stopPolling]);

  return {
    status,
    ovhNumber,
    errorMessage,
    timeRemaining,
    isCapacitor,
    initVerification,
    startPolling,
    stopPolling,
    triggerCall,
    reset,
  };
};
