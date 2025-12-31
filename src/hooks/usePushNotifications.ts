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
  const tokenSavedRef = useRef(false);

  const saveToken = useCallback(async (token: string, platform: string) => {
    if (!user) {
      console.log("[Push] No user, cannot save token");
      return;
    }

    if (tokenSavedRef.current) {
      console.log("[Push] Token already saved this session");
      return;
    }

    console.log("[Push] 📱 Saving token for user:", user.id, "platform:", platform);
    console.log("[Push] Token value:", token.substring(0, 50) + "...");
    
    // Delete existing tokens for this platform first to avoid conflicts
    const { error: deleteError } = await supabase
      .from("push_tokens")
      .delete()
      .eq("user_id", user.id)
      .eq("platform", platform);
    
    if (deleteError) {
      console.error("[Push] Error deleting old tokens:", deleteError);
    }
    
    // Insert the new token
    const { error } = await supabase
      .from("push_tokens")
      .insert({ user_id: user.id, token, platform });

    if (error) {
      console.error("[Push] ❌ Error saving token:", error);
    } else {
      console.log("[Push] ✅ Token saved successfully to Supabase");
      tokenSavedRef.current = true;
    }
  }, [user]);

  const registerPushNotifications = useCallback(async () => {
    const currentPlatform = Capacitor.getPlatform();
    console.log("[Push] 🚀 registerPushNotifications called on platform:", currentPlatform);
    
    if (!Capacitor.isNativePlatform()) {
      console.log("[Push] Not a native platform, skipping push registration");
      return;
    }

    console.log("[Push] Already registered:", registeredRef.current);

    try {
      // Check permissions
      let permStatus = await PushNotifications.checkPermissions();
      console.log("[Push] Current permission status:", permStatus.receive);

      if (permStatus.receive === "prompt") {
        console.log("[Push] Requesting permission...");
        permStatus = await PushNotifications.requestPermissions();
        console.log("[Push] Permission result:", permStatus.receive);
      }

      if (permStatus.receive !== "granted") {
        console.log("[Push] ❌ Permission not granted:", permStatus.receive);
        return;
      }

      console.log("[Push] ✅ Permission granted, calling register()...");
      
      // Register with APNs / FCM
      await PushNotifications.register();
      registeredRef.current = true;
      console.log("[Push] 📲 Registration initiated, waiting for token callback...");

    } catch (error) {
      console.error("[Push] ❌ Registration error:", error);
    }
  }, []);

  useEffect(() => {
    const platform = Capacitor.getPlatform();
    console.log("[Push] useEffect - user:", user?.id, "platform:", platform, "isNative:", Capacitor.isNativePlatform());
    
    if (!user || !Capacitor.isNativePlatform()) {
      console.log("[Push] Skipping: no user or not native");
      return;
    }

    console.log("[Push] Setting up listeners...");

    // Handle registration success
    const registrationListener = PushNotifications.addListener(
      "registration",
      (token: Token) => {
        console.log("[Push] 🎉 Registration SUCCESS! Token received:", token.value);
        const tokenPlatform = Capacitor.getPlatform(); // 'ios' or 'android'
        saveToken(token.value, tokenPlatform);
      }
    );

    // Handle registration error
    const errorListener = PushNotifications.addListener(
      "registrationError",
      (error) => {
        console.error("[Push] ❌ Registration ERROR:", JSON.stringify(error));
      }
    );

    // Handle push notification received while app is in foreground
    const receivedListener = PushNotifications.addListener(
      "pushNotificationReceived",
      (notification: PushNotificationSchema) => {
        console.log("[Push] 📩 Notification received in foreground:", JSON.stringify(notification));
        // The IncomingCallListener will handle the UI
      }
    );

    // Handle user tapping on notification
    const actionListener = PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action: ActionPerformed) => {
        console.log("[Push] 👆 Notification action performed:", JSON.stringify(action));
        const data = action.notification.data;
        
        if (data?.type === "incoming_call" && data?.callId) {
          // Navigate to the call screen
          navigate(`/call/${data.callId}?resident=true`);
        }
      }
    );

    // Start registration immediately
    console.log("[Push] Calling registerPushNotifications()...");
    registerPushNotifications();

    return () => {
      console.log("[Push] Cleaning up listeners");
      registrationListener.then(l => l.remove());
      errorListener.then(l => l.remove());
      receivedListener.then(l => l.remove());
      actionListener.then(l => l.remove());
    };
  }, [user, registerPushNotifications, saveToken, navigate]);

  return { registerPushNotifications };
};
