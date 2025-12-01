import { useAuth } from "@/hooks/useAuth";
import IncomingCallListener from "@/components/resident/IncomingCallListener";

/**
 * Global wrapper that renders IncomingCallListener only for authenticated users.
 * Placed at App level so incoming calls are shown regardless of current page.
 */
const GlobalIncomingCallListener = () => {
  const { user } = useAuth();

  // Only render for authenticated users
  if (!user) return null;

  return <IncomingCallListener />;
};

export default GlobalIncomingCallListener;
