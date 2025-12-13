import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Loader2, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "anr_copilot_chat";

const CoPilotChat = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved).messages || [];
      }
    } catch (e) {
      console.error("Error loading copilot history:", e);
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages }));
    } catch (e) {
      console.error("Error saving copilot history:", e);
    }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const streamChat = async (userMessage: string) => {
    setIsLoading(true);
    
    const userMsg: Message = { role: "user", content: userMessage };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Vous devez être connecté");
        setIsLoading(false);
        return;
      }

      const response = await fetch(`https://mkzpdmyymabgsntwmmir.supabase.co/functions/v1/copilot-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          session_id: sessionId,
          context: {
            current_path: location.pathname,
            current_section: document.querySelector('[data-copilot-section]')?.getAttribute('data-copilot-section') || null,
            visible_elements: Array.from(document.querySelectorAll('[data-copilot-id]')).map(el => el.getAttribute('data-copilot-id')),
            form_state: {}
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === 'COPILOT_NOT_ENABLED') {
          toast.error("Le Co-Pilot n'est pas activé pour votre compte");
        } else {
          toast.error(errorData.message || "Erreur du service");
        }
        setIsLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");
      
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";

      // Add empty assistant message
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            }
          } catch {
            // Incomplete JSON, continue
          }
        }
      }
    } catch (error) {
      console.error("CoPilot error:", error);
      toast.error("Erreur lors de l'envoi du message");
      // Remove the empty assistant message on error
      setMessages(prev => prev.filter((_, i) => i !== prev.length - 1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput("");
    await streamChat(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // CoPilot is now accessed from dashboard, not floating button
  if (!user || !isOpen) return null;

  return (
    <>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed top-20 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)]",
          "bg-background border rounded-2xl shadow-2xl",
          "transition-all duration-300 origin-top-right",
          isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
        )}
        style={{ maxHeight: "calc(100vh - 100px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600/10 to-cyan-500/10 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500">
              <Compass className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">ANR Co-Pilot</h3>
              <p className="text-xs text-muted-foreground">Votre guide personnel</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearHistory} className="text-xs text-muted-foreground">
                Effacer
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="h-[350px] p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <div className="p-4 rounded-full bg-gradient-to-r from-blue-600/20 to-cyan-500/20 mb-4">
                <Sparkles className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="font-medium mb-2">Bienvenue sur Co-Pilot !</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Je suis là pour vous guider pas à pas dans l'application ANR.
              </p>
              <div className="space-y-2 w-full">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs justify-start"
                  onClick={() => streamChat("Comment programmer un accès pour ma nounou ?")}
                >
                  💡 Programmer un accès pour ma nounou
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs justify-start"
                  onClick={() => streamChat("Comment inviter un autre résident ?")}
                >
                  💡 Inviter un autre résident
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs justify-start"
                  onClick={() => streamChat("Comment partager mon code ANR ?")}
                >
                  💡 Partager mon code ANR
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    )}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Posez votre question..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CoPilotChat;
