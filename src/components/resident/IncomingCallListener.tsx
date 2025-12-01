import { useAuth } from "@/hooks/useAuth";
import { useIncomingCallDetection } from "@/hooks/useIncomingCallDetection";
import IncomingCallScreen from "@/components/call/IncomingCallScreen";

const IncomingCallListener = () => {
  const { user } = useAuth();
  const { incomingCall, clearIncomingCall } = useIncomingCallDetection(user?.id);

  if (!incomingCall) return null;

  return (
    <IncomingCallScreen
      participantId={incomingCall.participantId}
      callId={incomingCall.callId}
      habitationName={incomingCall.habitationName}
      address={incomingCall.address}
      onDismiss={clearIncomingCall}
    />
  );
};

export default IncomingCallListener;
