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
  const [timeRemaining, setTimeRemaining] = useState<number>(600);
  
  // Use refs to avoid closure issues
  const verificationIdRef = useRef<string | null>(null);
  const pollingRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const expiresAtRef = useRef<Date | null>(null);
  const statusRef = useRef<VerificationStatus>("idle");

  // Keep statusRef in sync
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

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
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
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

  const stopPolling = useCallback(() => {
    console.log("[usePhoneVerification] stopPolling called");
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

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

      console.log("[usePhoneVerification] Calling init-phone-auth...");
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

      console.log("[usePhoneVerification] Init successful:", data.verification_id);
      
      // Store in ref (not state) to avoid closure issues
      verificationIdRef.current = data.verification_id;
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

  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      console.log("[usePhoneVerification] Polling already running");
      return;
    }
    
    const currentId = verificationIdRef.current;
    if (!currentId) {
      console.error("[usePhoneVerification] No verificationId to poll");
      return;
    }
    
    console.log("[usePhoneVerification] Starting polling for:", currentId);
    setStatus("waiting");

    const doCheck = async () => {
      // Read from ref to get current value
      const id = verificationIdRef.current;
      const currentStatus = statusRef.current;
      
      if (!id) {
        console.log("[usePhoneVerification] No verificationId, stopping poll");
        stopPolling();
        return;
      }
      
      if (currentStatus === "verified" || currentStatus === "expired") {
        console.log("[usePhoneVerification] Status is", currentStatus, ", stopping poll");
        stopPolling();
        return;
      }

      console.log("[usePhoneVerification] Checking verification:", id);

      try {
        const response = await supabase.functions.invoke("check-phone-auth", {
          body: { verification_id: id },
        });

        if (response.error) {
          console.error("[usePhoneVerification] Check error:", response.error);
          return;
        }

        const data = response.data;
        console.log("[usePhoneVerification] Check response:", data);
        
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
    };

    // Check immediately
    doCheck();
    
    // Then every 3 seconds
    pollingRef.current = window.setInterval(doCheck, 3000);
  }, [stopPolling]);

  const triggerCall = useCallback(() => {
    const telUrl = `tel:${ovhNumber.replace(/\s/g, "")}`;
    
    const link = document.createElement("a");
    link.href = telUrl;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log("[usePhoneVerification] Triggered call to:", telUrl);
  }, [ovhNumber]);

  const reset = useCallback(() => {
    stopPolling();
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus("idle");
    setErrorMessage(null);
    setTimeRemaining(600);
    verificationIdRef.current = null;
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
