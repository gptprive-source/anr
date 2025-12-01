import { useAuth } from "@/hooks/useAuth";
import { useIncomingCallDetection } from "@/hooks/useIncomingCallDetection";
import { useEffect, useState } from "react";

/**
 * Visual debug indicator for Android testing
 * Shows the state of authentication and incoming calls
 */
const DebugIndicator = () => {
  const { user } = useAuth();
  const { incomingCall } = useIncomingCallDetection(user?.id);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPollCount(c => c + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        background: "rgba(0,0,0,0.8)",
        color: "white",
        padding: "8px",
        fontSize: "12px",
        zIndex: 999999,
        fontFamily: "monospace",
      }}
    >
      <div>🔍 DEBUG MODE</div>
      <div>User: {user?.id ? `✅ ${user.id.slice(0, 8)}` : "❌ Not authenticated"}</div>
      <div>Incoming Call: {incomingCall ? `📞 ${incomingCall.callId.slice(0, 8)}` : "❌ None"}</div>
      <div>Poll Count: {pollCount}</div>
      <div>Time: {new Date().toLocaleTimeString()}</div>
    </div>
  );
};

export default DebugIndicator;
