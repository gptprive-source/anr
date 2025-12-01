import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface IncomingCallPortalProps {
  children: ReactNode;
}

/**
 * Portal component to render incoming call screen at root level
 * Ensures it displays above all other content on Android
 */
const IncomingCallPortal = ({ children }: IncomingCallPortalProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.log("[IncomingCallPortal] ✅ Portal mounted");
    return () => {
      console.log("[IncomingCallPortal] 🛑 Portal unmounted");
      setMounted(false);
    };
  }, []);

  if (!mounted) return null;

  return createPortal(children, document.body);
};

export default IncomingCallPortal;
