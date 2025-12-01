import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface IncomingCallPortalProps {
  children: ReactNode;
}

/**
 * Portal component to render incoming call screen in a dedicated div
 * outside of the React root to ensure it displays above all other content
 */
const IncomingCallPortal = ({ children }: IncomingCallPortalProps) => {
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Use the dedicated portal div instead of document.body
    let element = document.getElementById("incoming-call-portal");
    
    if (!element) {
      // Fallback: create the element if it doesn't exist
      console.log("[IncomingCallPortal] ⚠️ Creating portal element fallback");
      element = document.createElement("div");
      element.id = "incoming-call-portal";
      document.body.appendChild(element);
    } else {
      console.log("[IncomingCallPortal] ✅ Found portal element");
    }
    
    setPortalElement(element);

    return () => {
      console.log("[IncomingCallPortal] 🛑 Portal cleanup");
    };
  }, []);

  if (!portalElement) {
    console.log("[IncomingCallPortal] ⏳ Waiting for portal element");
    return null;
  }

  console.log("[IncomingCallPortal] 🎯 Rendering into portal");
  return createPortal(children, portalElement);
};

export default IncomingCallPortal;
