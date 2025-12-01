import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import IncomingCallListener from "@/components/resident/IncomingCallListener";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useWebPush } from "@/hooks/useWebPush";

/**
 * Global wrapper that renders IncomingCallListener only for authenticated users.
 * Placed at App level so incoming calls are shown regardless of current page.
 * Also handles push notification registration for native apps and PWAs.
 */
const GlobalIncomingCallListener = () => {
  console.log("[GlobalIncomingCallListener] 🎬 Component function called");
  
  const { user } = useAuth();
  
  console.log("[GlobalIncomingCallListener] 🔄 Rendering, user:", user?.id || "NOT_AUTHENTICATED");
  console.log("[GlobalIncomingCallListener] 🔄 User object:", JSON.stringify(user));
  
  // Register for push notifications (native platforms)
  usePushNotifications();
  
  // Register for web push notifications (PWA)
  useWebPush();

  // Register push service worker for PWA
  useEffect(() => {
    console.log("[GlobalIncomingCallListener] 📱 ServiceWorker check, user:", user?.id);
    if ("serviceWorker" in navigator && user) {
      navigator.serviceWorker.register("/sw-push.js").then((registration) => {
        console.log("[SW] Push service worker registered:", registration.scope);
      }).catch((error) => {
        console.error("[SW] Push service worker registration failed:", error);
      });
    }
  }, [user]);

  // Only render for authenticated users
  if (!user) {
    console.log("[GlobalIncomingCallListener] ⛔ No user, not rendering IncomingCallListener");
    return null;
  }

  console.log("[GlobalIncomingCallListener] ✅ User authenticated, rendering IncomingCallListener");
  return <IncomingCallListener />;
};

export default GlobalIncomingCallListener;
