import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SupportChat = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [requestHuman, setRequestHuman] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    let assistantContent = "";

    try {
      const response = await fetch(
        `https://mkzpdmyymabgsntwmmir.supabase.co/functions/v1/support-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur du service");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

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
      console.error("Chat error:", error);
      toast.error("Erreur lors de l'envoi du message");
      // Remove the empty assistant message on error
      setMessages(prev => prev.filter((_, i) => i !== prev.length - 1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput("");
    streamChat(message);
  };

  const handleRequestHuman = async () => {
    setRequestHuman(true);
    
    // Create support conversation in database
    if (user) {
      try {
        const { data: conv, error: convError } = await supabase
          .from('support_conversations')
          .insert({ user_id: user.id, status: 'pending' })
          .select()
          .single();

        if (convError) throw convError;

        // Add all messages to the conversation
        if (conv && messages.length > 0) {
          const messagesToInsert = messages.map(m => ({
            conversation_id: conv.id,
            sender_type: m.role === 'user' ? 'user' : 'bot',
            sender_id: m.role === 'user' ? user.id : null,
            content: m.content,
          }));

          await supabase.from('support_messages').insert(messagesToInsert);
        }

        toast.success("Demande envoyée ! Un agent vous contactera bientôt.");
      } catch (error) {
        console.error("Error creating support conversation:", error);
        toast.error("Erreur lors de l'envoi de la demande");
      }
    } else {
      toast.info("Connectez-vous pour demander une assistance humaine");
    }
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg",
          "flex items-center justify-center hover:scale-105 transition-transform",
          isOpen && "hidden"
        )}
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-[350px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-8rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Support ANR</h3>
                <p className="text-xs text-muted-foreground">
                  {requestHuman ? "En attente d'un agent" : "Assistant virtuel"}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Bonjour ! Comment puis-je vous aider ?</p>
                <p className="text-xs mt-2">Posez-moi vos questions sur l'ANR</p>
              </div>
            )}
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "flex-row-reverse" : ""
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    message.role === "user" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted"
                  )}>
                    {message.role === "user" ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  )}>
                    {message.content || (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Réflexion...
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Request Human Support */}
          {!requestHuman && messages.length > 0 && (
            <div className="px-4 py-2 border-t border-border">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs gap-2"
                onClick={handleRequestHuman}
              >
                <UserCog className="w-4 h-4" />
                Parler à un agent humain
              </Button>
            </div>
          )}

          {requestHuman && (
            <div className="px-4 py-3 bg-green-500/10 text-green-700 text-xs text-center">
              ✓ Un agent prendra en charge votre demande très bientôt
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-border">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-2"
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Écrivez votre message..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SupportChat;
