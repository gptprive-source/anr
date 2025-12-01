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
  const { user } = useAuth();
  
  // Register for push notifications (native platforms)
  usePushNotifications();
  
  // Register for web push notifications (PWA)
  useWebPush();

  // Register push service worker for PWA
  useEffect(() => {
    if ("serviceWorker" in navigator && user) {
      navigator.serviceWorker.register("/sw-push.js").then((registration) => {
        console.log("[SW] Push service worker registered:", registration.scope);
      }).catch((error) => {
        console.error("[SW] Push service worker registration failed:", error);
      });
    }
  }, [user]);

  // Only render for authenticated users
  if (!user) return null;

  return <IncomingCallListener />;
};

export default GlobalIncomingCallListener;
