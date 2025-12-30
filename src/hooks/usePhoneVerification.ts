import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "anr_phone_verification";

export type VerificationStatus = "idle" | "initializing" | "calling" | "waiting" | "verified" | "expired" | "error";

interface StoredVerification {
  verificationId: string;
  ovhNumber: string;
  expiresAt: string;
  phoneNumber: string;
}

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

  // Restore verification from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data: StoredVerification = JSON.parse(stored);
        const expiresAt = new Date(data.expiresAt);
        
        // Check if not expired
        if (expiresAt > new Date()) {
          setVerificationId(data.verificationId);
          setOvhNumber(data.ovhNumber);
          expiresAtRef.current = expiresAt;
          setTimeRemaining(Math.floor((expiresAt.getTime() - Date.now()) / 1000));
          setStatus("waiting");
          console.log("[usePhoneVerification] Restored verification from storage:", data.verificationId);
        } else {
          // Expired, clean up
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

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
      
      // Save to localStorage for persistence across page reloads
      const storedData: StoredVerification = {
        verificationId: data.verification_id,
        ovhNumber: data.ovh_number,
        expiresAt: data.expires_at,
        phoneNumber,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storedData));
      console.log("[usePhoneVerification] Saved verification to storage:", data.verification_id);
      
      return true;
    } catch (error) {
      console.error("[usePhoneVerification] Init error:", error);
      setErrorMessage("Erreur de connexion au serveur");
      setStatus("error");
      return false;
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const checkVerification = useCallback(async () => {
    // Read verificationId from localStorage to avoid stale closure issues
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log("[usePhoneVerification] No stored verification found");
      return;
    }
    
    let storedId: string;
    try {
      const data: StoredVerification = JSON.parse(stored);
      storedId = data.verificationId;
    } catch (e) {
      console.error("[usePhoneVerification] Failed to parse stored verification");
      return;
    }
    
    if (!storedId || status === "verified" || status === "expired") {
      console.log("[usePhoneVerification] Skipping check:", { storedId: !!storedId, status });
      return;
    }

    console.log("[usePhoneVerification] Checking verification:", storedId);

    try {
      const response = await supabase.functions.invoke("check-phone-auth", {
        body: { verification_id: storedId },
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
        localStorage.removeItem(STORAGE_KEY);
      } else if (data.status === "expired") {
        setStatus("expired");
        stopPolling();
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error("[usePhoneVerification] Check error:", error);
    }
  }, [status, stopPolling]);

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


  const triggerCall = useCallback(() => {
    const telUrl = `tel:${ovhNumber.replace(/\s/g, "")}`;
    
    // Use invisible link to prevent page reload
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
    setVerificationId(null);
    expiresAtRef.current = null;
    localStorage.removeItem(STORAGE_KEY);
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
