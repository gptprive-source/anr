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
    if (!user) return;

    console.log("[WebPush] Saving subscription for user:", user.id);
    
    const subscriptionJSON = subscription.toJSON();
    const tokenString = JSON.stringify(subscriptionJSON);
    
    // Delete existing web tokens for this user first
    await supabase
      .from("push_tokens")
      .delete()
      .eq("user_id", user.id)
      .eq("platform", "web");
    
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
      console.log("[WebPush] Subscription saved successfully");
    }
  }, [user]);

  const registerWebPush = useCallback(async () => {
    if (registeredRef.current) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("[WebPush] Push not supported");
      return;
    }

    console.log("[WebPush] Registering for web push...");

    try {
      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;
      console.log("[WebPush] Service worker ready");

      // Check existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Subscribe to push
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: VAPID_PUBLIC_KEY,
        });
        console.log("[WebPush] New subscription created");
      } else {
        console.log("[WebPush] Existing subscription found");
      }

      await saveSubscription(subscription);
      registeredRef.current = true;

    } catch (error) {
      console.error("[WebPush] Registration error:", error);
    }
  }, [saveSubscription]);

  useEffect(() => {
    if (!user) return;

    // Request notification permission first
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          registerWebPush();
        }
      });
    } else if (Notification.permission === "granted") {
      registerWebPush();
    }
  }, [user, registerWebPush]);

  return { registerWebPush };
};
