import { useAuth } from "@/hooks/useAuth";
import { useIncomingCallDetection } from "@/hooks/useIncomingCallDetection";
import IncomingCallScreen from "@/components/call/IncomingCallScreen";
import IncomingCallPortal from "@/components/call/IncomingCallPortal";

const IncomingCallListener = () => {
  const { user } = useAuth();
  
  console.log("[IncomingCallListener] 🔄 Component rendering, userId:", user?.id || "NO_USER");
  
  const { incomingCall, clearIncomingCall } = useIncomingCallDetection(user?.id);

  console.log("[IncomingCallListener] 📞 IncomingCall state:", incomingCall ? `CALL_PRESENT (${incomingCall.callId})` : "NO_CALL");

  if (!incomingCall) {
    console.log("[IncomingCallListener] ⛔ No incoming call, rendering nothing");
    return null;
  }

  console.log("[IncomingCallListener] ✅ Rendering IncomingCallScreen via Portal for call:", incomingCall.callId);
  return (
    <IncomingCallPortal>
      <IncomingCallScreen
        participantId={incomingCall.participantId}
        callId={incomingCall.callId}
        habitationName={incomingCall.habitationName}
        address={incomingCall.address}
        onDismiss={clearIncomingCall}
      />
    </IncomingCallPortal>
  );
};

export default IncomingCallListener;
