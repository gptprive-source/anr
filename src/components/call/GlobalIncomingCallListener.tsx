import { useAuth } from "@/hooks/useAuth";
import IncomingCallListener from "@/components/resident/IncomingCallListener";
import { usePushNotifications } from "@/hooks/usePushNotifications";

/**
 * Global wrapper that renders IncomingCallListener only for authenticated users.
 * Placed at App level so incoming calls are shown regardless of current page.
 * Also handles push notification registration for native apps.
 */
const GlobalIncomingCallListener = () => {
  const { user } = useAuth();
  
  // Register for push notifications (only on native platforms)
  usePushNotifications();

  // Only render for authenticated users
  if (!user) return null;

  return <IncomingCallListener />;
};

export default GlobalIncomingCallListener;
