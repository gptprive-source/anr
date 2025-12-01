import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// VAPID public key - must match the private key in edge function
const VAPID_PUBLIC_KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const useWebPush = () => {
  const { user } = useAuth();
  const registeredRef = useRef(false);

  const saveSubscription = useCallback(async (subscription: PushSubscription) => {
    if (!user) {
      console.log("[WebPush] No user, cannot save subscription");
      return;
    }

    console.log("[WebPush] Saving subscription for user:", user.id);
    
    const subscriptionJSON = subscription.toJSON();
    const tokenString = JSON.stringify(subscriptionJSON);
    
    // Delete existing web tokens for this user first
    const { error: deleteError } = await supabase
      .from("push_tokens")
      .delete()
      .eq("user_id", user.id)
      .eq("platform", "web");
    
    if (deleteError) {
      console.error("[WebPush] Error deleting old tokens:", deleteError);
    }
    
    // Insert the new token
    const { error } = await supabase
      .from("push_tokens")
      .insert({ 
        user_id: user.id, 
        token: tokenString,
        platform: "web"
      });

    if (error) {
      console.error("[WebPush] Error saving subscription:", error);
    } else {
      console.log("[WebPush] ✅ Subscription saved successfully");
    }
  }, [user]);

  const registerWebPush = useCallback(async () => {
    console.log("[WebPush] registerWebPush called, already registered:", registeredRef.current);
    
    if (registeredRef.current) {
      console.log("[WebPush] Already registered, skipping");
      return;
    }
    
    if (!("serviceWorker" in navigator)) {
      console.log("[WebPush] ❌ Service Worker not supported");
      return;
    }
    
    if (!("PushManager" in window)) {
      console.log("[WebPush] ❌ PushManager not supported");
      return;
    }

    console.log("[WebPush] 🚀 Registering for web push...");

    try {
      // First register the service worker if not already
      const existingRegistration = await navigator.serviceWorker.getRegistration("/sw-push.js");
      let registration = existingRegistration;
      
      if (!registration) {
        console.log("[WebPush] Registering service worker...");
        registration = await navigator.serviceWorker.register("/sw-push.js");
        console.log("[WebPush] Service worker registered");
      } else {
        console.log("[WebPush] Service worker already registered");
      }
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log("[WebPush] Service worker ready");

      // Check existing subscription
      let subscription = await registration.pushManager.getSubscription();
      console.log("[WebPush] Existing subscription:", subscription ? "found" : "none");
      
      if (!subscription) {
        console.log("[WebPush] Creating new subscription...");
        // Subscribe to push
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });
        console.log("[WebPush] ✅ New subscription created:", subscription.endpoint);
      }

      await saveSubscription(subscription);
      registeredRef.current = true;
      console.log("[WebPush] ✅ Registration complete");

    } catch (error) {
      console.error("[WebPush] ❌ Registration error:", error);
    }
  }, [saveSubscription]);

  useEffect(() => {
    if (!user) {
      console.log("[WebPush] No user, skipping registration");
      return;
    }

    console.log("[WebPush] User logged in, checking notification permission...");
    
    // Request notification permission first
    if ("Notification" in window) {
      const currentPermission = Notification.permission;
      console.log("[WebPush] Current notification permission:", currentPermission);
      
      if (currentPermission === "default") {
        console.log("[WebPush] Requesting permission...");
        Notification.requestPermission().then((permission) => {
          console.log("[WebPush] Permission result:", permission);
          if (permission === "granted") {
            registerWebPush();
          }
        });
      } else if (currentPermission === "granted") {
        registerWebPush();
      } else {
        console.log("[WebPush] ❌ Notification permission denied");
      }
    } else {
      console.log("[WebPush] ❌ Notifications not supported");
    }
  }, [user, registerWebPush]);

  return { registerWebPush };
};
