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

  // Request camera/microphone permissions early for PWA
  useEffect(() => {
    if (!user) return;
    
    const requestMediaPermissions = async () => {
      try {
        // Check if permissions already granted
        const cameraPermission = await navigator.permissions.query({ name: "camera" as PermissionName });
        const micPermission = await navigator.permissions.query({ name: "microphone" as PermissionName });
        
        if (cameraPermission.state === "granted" && micPermission.state === "granted") {
          console.log("[Permissions] Camera and microphone already granted");
          return;
        }
        
        console.log("[Permissions] Requesting camera and microphone access...");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        stream.getTracks().forEach(track => track.stop());
        console.log("[Permissions] Camera and microphone permissions granted");
      } catch (err) {
        console.error("[Permissions] Failed to get media permissions:", err);
      }
    };
    
    requestMediaPermissions();
  }, [user]);

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
