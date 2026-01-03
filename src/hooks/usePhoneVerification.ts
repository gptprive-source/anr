import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VerificationStatus = "idle" | "initializing" | "waiting" | "verified" | "expired" | "error";

export const usePhoneVerification = () => {
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(600);
  
  const pollingRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const verificationIdRef = useRef<string | null>(null);
  const expiresAtRef = useRef<Date | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    console.log("[Phone] Stopping polling");
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    setStatus("idle");
    setErrorMessage(null);
    setTimeRemaining(600);
    verificationIdRef.current = null;
    expiresAtRef.current = null;
  }, [stopPolling]);

  const initVerification = async (phoneNumber: string, deviceId: string): Promise<boolean> => {
    setStatus("initializing");
    setErrorMessage(null);
    stopPolling();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMessage("Session expirée. Veuillez vous reconnecter.");
        setStatus("error");
        return false;
      }

      console.log("[Phone] Calling init-phone-auth with Click2Call...");
      const response = await supabase.functions.invoke("init-phone-auth", {
        body: { phone_number: phoneNumber, device_id: deviceId },
      });

      if (response.error) {
        setErrorMessage(response.error.message || "Erreur lors de l'initialisation");
        setStatus("error");
        return false;
      }

      if (response.data?.error) {
        setErrorMessage(response.data.error);
        setStatus("error");
        return false;
      }

      const { verification_id, expires_at } = response.data;
      console.log("[Phone] Got verification_id:", verification_id);
      console.log("[Phone] Click2Call initiated - OVH will call user's phone");
      
      // Store in refs
      verificationIdRef.current = verification_id;
      expiresAtRef.current = new Date(expires_at);
      setTimeRemaining(Math.floor((expiresAtRef.current.getTime() - Date.now()) / 1000));
      setStatus("waiting");

      // START POLLING IMMEDIATELY
      console.log("[Phone] Starting polling NOW for:", verification_id);
      
      pollingRef.current = window.setInterval(async () => {
        const id = verificationIdRef.current;
        if (!id) {
          console.log("[Polling] No ID, skipping");
          return;
        }

        console.log("[Polling] Checking verification:", id);
        
        try {
          const res = await supabase.functions.invoke("check-phone-auth", {
            body: { verification_id: id },
          });
          
          console.log("[Polling] Response:", res.data);
          
          if (res.data?.verified) {
            console.log("[Polling] VERIFIED!");
            setStatus("verified");
            stopPolling();
          } else if (res.data?.status === "expired") {
            console.log("[Polling] Expired");
            setStatus("expired");
            stopPolling();
          }
        } catch (e) {
          console.error("[Polling] Error:", e);
        }
      }, 3000);

      // Start timer countdown
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

      // Do first check immediately
      console.log("[Phone] First check...");
      supabase.functions.invoke("check-phone-auth", {
        body: { verification_id },
      }).then(res => {
        console.log("[Phone] First check result:", res.data);
        if (res.data?.verified) {
          setStatus("verified");
          stopPolling();
        }
      });

      return true;
    } catch (error) {
      console.error("[Phone] Error:", error);
      setErrorMessage("Erreur de connexion au serveur");
      setStatus("error");
      return false;
    }
  };

  return {
    status,
    errorMessage,
    timeRemaining,
    initVerification,
    reset,
  };
};
