import { useIncomingCall } from "@/contexts/IncomingCallContext";
import IncomingCallScreen from "@/components/call/IncomingCallScreen";
import IncomingCallPortal from "@/components/call/IncomingCallPortal";

const IncomingCallListener = () => {
  const { incomingCall, clearIncomingCall } = useIncomingCall();

  console.log("[IncomingCallListener] 📞 Render, hasCall:", !!incomingCall);

  if (!incomingCall) {
    return null;
  }

  console.log("[IncomingCallListener] ✅ Rendering IncomingCallScreen for:", incomingCall.callId);
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
