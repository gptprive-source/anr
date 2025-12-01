/**
 * IncomingCallListener is now a no-op component.
 * The actual incoming call detection and display is handled by:
 * - IncomingCallContext (polling logic)
 * - incomingCallRenderer (vanilla JS DOM manipulation)
 * 
 * This component is kept for backwards compatibility but does nothing.
 */
const IncomingCallListener = () => {
  // All logic moved to IncomingCallContext + incomingCallRenderer
  // No React rendering needed - vanilla JS handles the UI
  return null;
};

export default IncomingCallListener;
