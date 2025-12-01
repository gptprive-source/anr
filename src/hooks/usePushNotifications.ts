import { useEffect, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export const usePushNotifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const registeredRef = useRef(false);

  const saveToken = useCallback(async (token: string, platform: string) => {
    if (!user) return;

    console.log("[Push] Saving token for user:", user.id, "platform:", platform);
    
    // Upsert the token
    const { error } = await supabase
      .from("push_tokens")
      .upsert(
        { user_id: user.id, token, platform },
        { onConflict: "user_id,token" }
      );

    if (error) {
      console.error("[Push] Error saving token:", error);
    } else {
      console.log("[Push] Token saved successfully");
    }
  }, [user]);

  const registerPushNotifications = useCallback(async () => {
    if (registeredRef.current) return;
    if (!Capacitor.isNativePlatform()) {
      console.log("[Push] Not a native platform, skipping push registration");
      return;
    }

    console.log("[Push] Registering for push notifications...");

    try {
      // Check permissions
      let permStatus = await PushNotifications.checkPermissions();
      console.log("[Push] Current permission status:", permStatus.receive);

      if (permStatus.receive === "prompt") {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== "granted") {
        console.log("[Push] Permission not granted");
        return;
      }

      // Register with APNs / FCM
      await PushNotifications.register();
      registeredRef.current = true;
      console.log("[Push] Registration initiated");

    } catch (error) {
      console.error("[Push] Registration error:", error);
    }
  }, []);

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return;

    // Handle registration success
    const registrationListener = PushNotifications.addListener(
      "registration",
      (token: Token) => {
        console.log("[Push] Registration successful, token:", token.value);
        const platform = Capacitor.getPlatform(); // 'ios' or 'android'
        saveToken(token.value, platform);
      }
    );

    // Handle registration error
    const errorListener = PushNotifications.addListener(
      "registrationError",
      (error) => {
        console.error("[Push] Registration error:", error);
      }
    );

    // Handle push notification received while app is in foreground
    const receivedListener = PushNotifications.addListener(
      "pushNotificationReceived",
      (notification: PushNotificationSchema) => {
        console.log("[Push] Notification received:", notification);
        // The IncomingCallListener will handle the UI
      }
    );

    // Handle user tapping on notification
    const actionListener = PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action: ActionPerformed) => {
        console.log("[Push] Notification action performed:", action);
        const data = action.notification.data;
        
        if (data?.type === "incoming_call" && data?.callId) {
          // Navigate to the call screen
          navigate(`/call/${data.callId}?resident=true`);
        }
      }
    );

    // Start registration
    registerPushNotifications();

    return () => {
      registrationListener.then(l => l.remove());
      errorListener.then(l => l.remove());
      receivedListener.then(l => l.remove());
      actionListener.then(l => l.remove());
    };
  }, [user, registerPushNotifications, saveToken, navigate]);

  return { registerPushNotifications };
};
