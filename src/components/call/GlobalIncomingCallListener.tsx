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

  // Request camera/microphone permissions early for PWA (all users including visitors)
  useEffect(() => {
    const requestMediaPermissions = async () => {
      try {
        // Request VIDEO first (most important for peephole preview)
        console.log("[Permissions] Requesting VIDEO permission...");
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStream.getTracks().forEach(track => track.stop());
        console.log("[Permissions] VIDEO permission granted");
        
        // Then request AUDIO
        console.log("[Permissions] Requesting AUDIO permission...");
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getTracks().forEach(track => track.stop());
        console.log("[Permissions] AUDIO permission granted");
      } catch (err) {
        console.error("[Permissions] Failed to get media permissions:", err);
      }
    };
    
    requestMediaPermissions();
  }, []);

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

  // Render IncomingCallListener for all users (context handles auth check)
  return <IncomingCallListener />;
};

export default GlobalIncomingCallListener;
