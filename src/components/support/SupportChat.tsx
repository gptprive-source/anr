import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, UserCog, BookOpen, Sparkles, RefreshCw, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSupportChat } from "@/contexts/SupportChatContext";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface Message {
  role: "user" | "assistant" | "agent" | "faq" | "system";
  content: string;
  source?: "faq" | "ai" | "rgpd";
  usageId?: string;
  rated?: boolean;
}

const STORAGE_KEY = "anr_support_chat";

// Replace template variables in FAQ content with actual config values
const replaceConfigVariables = (text: string, configMap: Record<string, string>): string => {
  let result = text;
  Object.entries(configMap).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  });
  return result;
};

const SupportChat = () => {
  const { user } = useAuth();
  const { isOpen, setIsOpen, rgpdRequest, clearRGPDRequest } = useSupportChat();
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load messages from localStorage on init
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.messages || [];
      }
    } catch (e) {
      console.error("Error loading chat history:", e);
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [requestHuman, setRequestHuman] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved).requestHuman || false;
      }
    } catch {}
    return false;
  });
  const [conversationId, setConversationId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved).conversationId || null;
      }
    } catch {}
    return null;
  });
  const [lastFaqQuery, setLastFaqQuery] = useState<string | null>(null);
  const [configMap, setConfigMap] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rgpdProcessedRef = useRef<string | null>(null);

  // Load app config for template variable replacement
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data } = await supabase.from('app_config').select('key, value');
        if (data) {
          const map: Record<string, string> = {};
          data.forEach(config => {
            try {
              const value = typeof config.value === 'string' ? JSON.parse(config.value) : config.value;
              if (config.key === 'max_call_duration_seconds') {
                map[config.key] = String(Math.floor(value / 60));
                map['max_call_duration_minutes'] = String(Math.floor(value / 60));
              } else {
                map[config.key] = String(value);
              }
            } catch {
              map[config.key] = String(config.value);
            }
          });
          setConfigMap(map);
        }
      } catch (error) {
        console.error("Error loading config for FAQ:", error);
      }
    };
    loadConfig();
  }, []);

  // Save to localStorage whenever messages, requestHuman or conversationId change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        messages,
        requestHuman,
        conversationId
      }));
    } catch (e) {
      console.error("Error saving chat history:", e);
    }
  }, [messages, requestHuman, conversationId]);

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

  // Handle RGPD request injection
  useEffect(() => {
    if (rgpdRequest && isOpen && rgpdRequest.requestId !== rgpdProcessedRef.current) {
      rgpdProcessedRef.current = rgpdRequest.requestId;
      
      // Add system message indicating RGPD context
      const systemMessage: Message = {
        role: "system",
        content: `📋 Demande RGPD enregistrée : ${rgpdRequest.typeLabel}${rgpdRequest.details ? ` - "${rgpdRequest.details}"` : ""}`,
        source: "rgpd"
      };
      
      // Create user message for the AI
      const userMessage = `Je souhaite exercer mon ${rgpdRequest.typeLabel.toLowerCase()}. ${rgpdRequest.details || ""}`.trim();
      
      setMessages(prev => [...prev, systemMessage]);
      
      // Automatically send to AI
      setTimeout(() => {
        processRGPDRequest(userMessage, rgpdRequest.requestId, rgpdRequest.type);
      }, 500);
      
      clearRGPDRequest();
    }
  }, [rgpdRequest, isOpen, clearRGPDRequest]);

  // Real-time subscription for agent replies
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase.channel(`support-messages-${conversationId}`).on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'support_messages',
      filter: `conversation_id=eq.${conversationId}`
    }, payload => {
      const newMsg = payload.new as any;
      if (newMsg.sender_type === 'agent') {
        setMessages(prev => [...prev, {
          role: 'agent',
          content: newMsg.content
        }]);
        toast.info("Nouvelle réponse du support !");
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Search FAQ first
  const searchFaq = async (query: string): Promise<{
    found: boolean;
    answer?: string;
    question?: string;
  }> => {
    try {
      const response = await fetch(`https://mkzpdmyymabgsntwmmir.supabase.co/functions/v1/faq-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          query,
          threshold: 0.3
        })
      });
      if (!response.ok) {
        console.error("FAQ search error:", response.status);
        return { found: false };
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("FAQ search error:", error);
      return { found: false };
    }
  };

  const processRGPDRequest = async (userMessage: string, requestId: string, requestType: string) => {
    setIsLoading(true);
    
    const userMsg: Message = {
      role: "user",
      content: userMessage
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await fetch(`https://mkzpdmyymabgsntwmmir.supabase.co/functions/v1/support-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: userMessage }],
          rgpdContext: {
            requestId,
            requestType,
            userId: user?.id,
            userEmail: user?.email
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur du service");
      }

      await handleStreamResponse(response);
    } catch (error) {
      console.error("RGPD AI error:", error);
      toast.error("Erreur lors du traitement de la demande");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStreamResponse = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No reader");

    const decoder = new TextDecoder();
    let buffer = "";
    let assistantContent = "";

    // Generate a temporary usage ID for tracking
    const tempUsageId = `temp_${Date.now()}`;
    
    // Add empty assistant message with AI source
    setMessages(prev => [...prev, {
      role: "assistant",
      content: "",
      source: "ai",
      usageId: tempUsageId
    }]);

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
          const usageId = parsed.usage_id;
          if (content) {
            assistantContent += content;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: assistantContent,
                source: "ai",
                usageId: usageId || tempUsageId
              };
              return updated;
            });
          }
        } catch {
          // Incomplete JSON, continue
        }
      }
    }
  };

  const streamAiChat = async (userMessage: string, allMessages: Message[]) => {
    let assistantContent = "";
    try {
      const response = await fetch(`https://mkzpdmyymabgsntwmmir.supabase.co/functions/v1/support-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          messages: allMessages.filter(m => m.role !== "system").map(m => ({
            role: m.role === 'agent' || m.role === 'faq' ? 'assistant' : m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur du service");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();
      let buffer = "";
      const tempUsageId = `temp_${Date.now()}`;

      // Add empty assistant message with AI source
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "",
        source: "ai",
        usageId: tempUsageId
      }]);

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
            const usageId = parsed.usage_id;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                  source: "ai",
                  usageId: usageId || tempUsageId
                };
                return updated;
              });
            }
          } catch {
            // Incomplete JSON, continue
          }
        }
      }
    } catch (error) {
      console.error("AI chat error:", error);
      toast.error("Erreur lors de l'envoi du message");
      // Remove the empty assistant message on error
      setMessages(prev => prev.filter((_, i) => i !== prev.length - 1));
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput("");
    if (requestHuman && conversationId) {
      // Send directly to conversation (human mode)
      sendHumanMessage(message);
      return;
    }

    // Add user message
    const userMsg: Message = {
      role: "user",
      content: message
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setLastFaqQuery(message);

    try {
      // Step 1: Search FAQ first (free, instant)
      const faqResult = await searchFaq(message);
      if (faqResult.found && faqResult.answer) {
        // FAQ found - display with variables replaced
        const processedAnswer = replaceConfigVariables(faqResult.answer!, configMap);
        setMessages(prev => [...prev, {
          role: "faq",
          content: processedAnswer,
          source: "faq"
        }]);
      } else {
        // No FAQ match - call AI
        await streamAiChat(message, [...messages, userMsg]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Erreur lors de l'envoi du message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryWithAi = async () => {
    if (!lastFaqQuery || isLoading) return;
    setIsLoading(true);
    try {
      await streamAiChat(lastFaqQuery, messages);
    } finally {
      setIsLoading(false);
      setLastFaqQuery(null);
    }
  };

  const sendHumanMessage = async (content: string) => {
    if (!conversationId || !user) return;
    setMessages(prev => [...prev, {
      role: "user",
      content
    }]);
    try {
      await supabase.from('support_messages').insert({
        conversation_id: conversationId,
        sender_type: 'user',
        sender_id: user.id,
        content
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erreur lors de l'envoi");
    }
  };

  const handleRequestHuman = async () => {
    setRequestHuman(true);

    // Create support conversation in database
    if (user) {
      try {
        const { data: conv, error: convError } = await supabase.from('support_conversations').insert({
          user_id: user.id,
          status: 'pending'
        }).select().single();
        if (convError) throw convError;

        // Add all messages to the conversation
        if (conv && messages.length > 0) {
          const messagesToInsert = messages.filter(m => m.role !== "system").map(m => ({
            conversation_id: conv.id,
            sender_type: m.role === 'user' ? 'user' : 'bot',
            sender_id: m.role === 'user' ? user.id : null,
            content: m.content
          }));
          await supabase.from('support_messages').insert(messagesToInsert);
        }

        // Send email notification to support team
        try {
          await supabase.functions.invoke('notify-support-request', {
            body: {
              conversationId: conv.id,
              userId: user.id,
              messages: messages.filter(m => m.role !== "system").map(m => ({
                role: m.role,
                content: m.content
              }))
            }
          });
        } catch (notifyError) {
          console.error("Error sending notification:", notifyError);
        }
        setConversationId(conv.id);
        toast.success("Demande envoyée ! Un agent vous contactera bientôt.");
      } catch (error) {
        console.error("Error creating support conversation:", error);
        toast.error("Erreur lors de l'envoi de la demande");
      }
    } else {
      toast.info("Connectez-vous pour demander une assistance humaine");
    }
  };

  const getMessageIcon = (message: Message) => {
    if (message.role === "user") return <User className="w-4 h-4" />;
    if (message.role === "agent") return <UserCog className="w-4 h-4" />;
    if (message.role === "system") return <FileText className="w-4 h-4" />;
    if (message.source === "faq") return <BookOpen className="w-4 h-4" />;
    return <Sparkles className="w-4 h-4" />;
  };

  const getMessageStyle = (message: Message) => {
    if (message.role === "user") return "bg-primary text-primary-foreground rounded-br-sm";
    if (message.role === "agent") return "bg-green-500/20 text-foreground rounded-bl-sm";
    if (message.role === "system") return "bg-amber-500/20 text-foreground rounded-bl-sm";
    if (message.source === "faq") return "bg-blue-500/20 text-foreground rounded-bl-sm";
    return "bg-muted rounded-bl-sm";
  };

  const getAvatarStyle = (message: Message) => {
    if (message.role === "user") return "bg-primary text-primary-foreground";
    if (message.role === "agent") return "bg-green-500 text-white";
    if (message.role === "system") return "bg-amber-500 text-white";
    if (message.source === "faq") return "bg-blue-500 text-white";
    return "bg-muted";
  };

  const lastMessageIsFaq = messages.length > 0 && messages[messages.length - 1].source === "faq";

  // Rate a message
  const rateMessage = async (messageIndex: number, rating: "positive" | "negative") => {
    const message = messages[messageIndex];
    if (!message.usageId || message.rated) return;
    
    try {
      // Update in database - we'll need an edge function or direct update
      await supabase.functions.invoke("chatbot-feedback", {
        body: { 
          queryText: messages[messageIndex - 1]?.content || "",
          responsePreview: message.content.slice(0, 100),
          rating,
          source: message.source || "ai"
        }
      });
      
      // Mark as rated locally
      setMessages(prev => {
        const updated = [...prev];
        updated[messageIndex] = { ...updated[messageIndex], rated: true };
        return updated;
      });
      
      toast.success(rating === "positive" ? "Merci pour votre feedback !" : "Merci, nous améliorerons cette réponse");
    } catch (error) {
      console.error("Error rating message:", error);
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
                {requestHuman ? <UserCog className="w-5 h-5 text-primary" /> : <Bot className="w-5 h-5 text-primary" />}
              </div>
              <div>
                <h3 className="font-semibold">Support Clients</h3>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setMessages([]);
                    setRequestHuman(false);
                    setConversationId(null);
                    rgpdProcessedRef.current = null;
                    localStorage.removeItem(STORAGE_KEY);
                  }}
                  title="Nouvelle conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Bonjour ! Comment puis-je vous aider ?</p>
              </div>
            )}
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={index}>
                  <div className={cn("flex gap-3", message.role === "user" ? "flex-row-reverse" : "")}>
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", getAvatarStyle(message))}>
                      {getMessageIcon(message)}
                    </div>
                    <div className={cn("max-w-[80%] rounded-2xl px-4 py-2 text-sm", getMessageStyle(message))}>
                      {message.source && message.role !== "user" && message.role !== "system" && (
                        <div className="text-[10px] font-medium opacity-70 mb-1 flex items-center gap-1">
                          {message.source === "faq" ? (
                            <>
                              <BookOpen className="w-3 h-3" /> Réponse de notre FAQ
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" /> Assistant IA
                            </>
                          )}
                        </div>
                      )}
                      {message.content || (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Réflexion...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Feedback buttons for AI/FAQ responses */}
                  {(message.source === "ai" || message.source === "faq") && message.content && !message.rated && (
                    <div className="mt-2 ml-11 flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2 text-muted-foreground hover:text-green-600 hover:bg-green-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          rateMessage(index, "positive");
                        }}
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2 text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          rateMessage(index, "negative");
                        }}
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </Button>
                      {message.source === "faq" && index === messages.length - 1 && !isLoading && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 gap-1.5 text-muted-foreground hover:text-foreground ml-1"
                          onClick={handleRetryWithAi}
                        >
                          <RefreshCw className="w-3 h-3" />
                          Réponse IA
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {message.rated && (
                    <div className="mt-1 ml-11 text-xs text-muted-foreground">
                      ✓ Merci pour votre feedback
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Request Human Support */}
          {!requestHuman && messages.length > 0 && !lastMessageIsFaq && (
            <div className="px-4 py-2 border-t border-border">
              <Button variant="outline" size="sm" className="w-full text-xs gap-2" onClick={handleRequestHuman}>
                <UserCog className="w-4 h-4" />
                Parler à un agent humain
              </Button>
            </div>
          )}

          {requestHuman && (
            <div className="px-4 py-2 bg-green-500/10 text-green-700 text-xs text-center">
              ✓ Vous êtes connecté avec le support. Continuez à écrire.
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-border">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Écrivez votre message..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SupportChat;
