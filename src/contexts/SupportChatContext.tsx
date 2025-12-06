import { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface RGPDRequest {
  requestId: string;
  type: string;
  typeLabel: string;
  details: string;
}

interface SupportChatContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  rgpdRequest: RGPDRequest | null;
  openWithRGPDRequest: (request: RGPDRequest) => void;
  clearRGPDRequest: () => void;
}

const SupportChatContext = createContext<SupportChatContextType | undefined>(undefined);

export const SupportChatProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rgpdRequest, setRGPDRequest] = useState<RGPDRequest | null>(null);

  const openWithRGPDRequest = useCallback((request: RGPDRequest) => {
    setRGPDRequest(request);
    setIsOpen(true);
  }, []);

  const clearRGPDRequest = useCallback(() => {
    setRGPDRequest(null);
  }, []);

  return (
    <SupportChatContext.Provider
      value={{
        isOpen,
        setIsOpen,
        rgpdRequest,
        openWithRGPDRequest,
        clearRGPDRequest,
      }}
    >
      {children}
    </SupportChatContext.Provider>
  );
};

export const useSupportChat = () => {
  const context = useContext(SupportChatContext);
  if (!context) {
    throw new Error("useSupportChat must be used within a SupportChatProvider");
  }
  return context;
};
