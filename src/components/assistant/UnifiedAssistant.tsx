import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Loader2, Compass, MessageCircle, Bot, User, UserCog, BookOpen, RefreshCw, FileText, Trash2, ThumbsUp, ThumbsDown, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";
import { useSupportChat } from "@/contexts/SupportChatContext";

// CoPilot types
interface CoPilotMessage {
  role: "user" | "assistant";
  content: string;
}

// Support types
interface SupportMessage {
  role: "user" | "assistant" | "agent" | "faq" | "system";
  content: string;
  source?: "faq" | "ai" | "rgpd";
  usageId?: string;
  rated?: boolean;
}

const COPILOT_STORAGE_KEY = "anr_copilot_chat";
const SUPPORT_STORAGE_KEY = "anr_support_chat";

const replaceConfigVariables = (text: string, configMap: Record<string, string>): string => {
  let result = text;
  Object.entries(configMap).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  });
  return result;
};

const UnifiedAssistant = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { isOpen: supportIsOpen, setIsOpen: setSupportIsOpen, rgpdRequest, clearRGPDRequest } = useSupportChat();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"copilot" | "support">("copilot");
  
  // CoPilot state
  const [copilotMessages, setCopilotMessages] = useState<CoPilotMessage[]>(() => {
    try {
      const saved = localStorage.getItem(COPILOT_STORAGE_KEY);
      if (saved) return JSON.parse(saved).messages || [];
    } catch {}
    return [];
  });
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  
  // Support state
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>(() => {
    try {
      const saved = localStorage.getItem(SUPPORT_STORAGE_KEY);
      if (saved) return JSON.parse(saved).messages || [];
    } catch {}
    return [];
  });
  const [supportInput, setSupportInput] = useState("");
  const [supportLoading, setSupportLoading] = useState(false);
  const [requestHuman, setRequestHuman] = useState(() => {
    try {
      const saved = localStorage.getItem(SUPPORT_STORAGE_KEY);
      if (saved) return JSON.parse(saved).requestHuman || false;
    } catch {}
    return false;
  });
  const [conversationId, setConversationId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(SUPPORT_STORAGE_KEY);
      if (saved) return JSON.parse(saved).conversationId || null;
    } catch {}
    return null;
  });
  const [lastFaqQuery, setLastFaqQuery] = useState<string | null>(null);
  const [configMap, setConfigMap] = useState<Record<string, string>>({});
  const [aiModeEnabled, setAiModeEnabled] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rgpdProcessedRef = useRef<string | null>(null);

  // Sync with SupportChatContext
  useEffect(() => {
    if (supportIsOpen) {
      setIsOpen(true);
      setActiveTab("support");
    }
  }, [supportIsOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSupportIsOpen(false);
    }
  }, [isOpen, setSupportIsOpen]);

  // Load config
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
              } else if (config.key === 'chatbot_ai_mode_enabled') {
                setAiModeEnabled(value === true || value === 'true');
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
        console.error("Error loading config:", error);
      }
    };
    loadConfig();
  }, []);

  // Save CoPilot messages
  useEffect(() => {
    try {
      localStorage.setItem(COPILOT_STORAGE_KEY, JSON.stringify({ messages: copilotMessages }));
    } catch {}
  }, [copilotMessages]);

  // Save Support messages
  useEffect(() => {
    try {
      localStorage.setItem(SUPPORT_STORAGE_KEY, JSON.stringify({
        messages: supportMessages,
        requestHuman,
        conversationId
      }));
    } catch {}
  }, [supportMessages, requestHuman, conversationId]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [copilotMessages, supportMessages, activeTab]);

  // Focus input
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, activeTab]);

  // Handle RGPD request
  useEffect(() => {
    if (rgpdRequest && isOpen && rgpdRequest.requestId !== rgpdProcessedRef.current) {
      rgpdProcessedRef.current = rgpdRequest.requestId;
      setActiveTab("support");
      
      const systemMessage: SupportMessage = {
        role: "system",
        content: `📋 Demande RGPD enregistrée : ${rgpdRequest.typeLabel}${rgpdRequest.details ? ` - "${rgpdRequest.details}"` : ""}`,
        source: "rgpd"
      };
      
      const userMessage = `Je souhaite exercer mon ${rgpdRequest.typeLabel.toLowerCase()}. ${rgpdRequest.details || ""}`.trim();
      
      setSupportMessages(prev => [...prev, systemMessage]);
      
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
        setSupportMessages(prev => [...prev, { role: 'agent', content: newMsg.content }]);
        toast.info("Nouvelle réponse du support !");
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  // ========== CoPilot Functions ==========
  const streamCopilotChat = async (userMessage: string) => {
    setCopilotLoading(true);
    
    const userMsg: CoPilotMessage = { role: "user", content: userMessage };
    const allMessages = [...copilotMessages, userMsg];
    setCopilotMessages(allMessages);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Vous devez être connecté");
        setCopilotLoading(false);
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
        setCopilotLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");
      
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";

      setCopilotMessages(prev => [...prev, { role: "assistant", content: "" }]);

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
              setCopilotMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch (error) {
      console.error("CoPilot error:", error);
      toast.error("Erreur lors de l'envoi du message");
      setCopilotMessages(prev => prev.filter((_, i) => i !== prev.length - 1));
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleCopilotSend = async () => {
    if (!copilotInput.trim() || copilotLoading) return;
    const message = copilotInput.trim();
    setCopilotInput("");
    await streamCopilotChat(message);
  };

  const clearCopilotHistory = () => {
    setCopilotMessages([]);
    localStorage.removeItem(COPILOT_STORAGE_KEY);
  };

  // ========== Support Functions ==========
  const searchFaq = async (query: string) => {
    try {
      const response = await fetch(`https://mkzpdmyymabgsntwmmir.supabase.co/functions/v1/faq-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({ query, threshold: 0.3 })
      });
      if (!response.ok) return { found: false };
      return await response.json();
    } catch {
      return { found: false };
    }
  };

  const processRGPDRequest = async (userMessage: string, requestId: string, requestType: string) => {
    setSupportLoading(true);
    const userMsg: SupportMessage = { role: "user", content: userMessage };
    setSupportMessages(prev => [...prev, userMsg]);

    try {
      const response = await fetch(`https://mkzpdmyymabgsntwmmir.supabase.co/functions/v1/support-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: userMessage }],
          rgpdContext: { requestId, requestType, userId: user?.id, userEmail: user?.email }
        })
      });

      if (!response.ok) throw new Error("Erreur du service");
      await handleSupportStreamResponse(response);
    } catch (error) {
      toast.error("Erreur lors du traitement de la demande");
    } finally {
      setSupportLoading(false);
    }
  };

  const handleSupportStreamResponse = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No reader");

    const decoder = new TextDecoder();
    let buffer = "";
    let assistantContent = "";
    const tempUsageId = `temp_${Date.now()}`;
    
    setSupportMessages(prev => [...prev, { role: "assistant", content: "", source: "ai", usageId: tempUsageId }]);

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
            setSupportMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: assistantContent, source: "ai", usageId: usageId || tempUsageId };
              return updated;
            });
          }
        } catch {}
      }
    }
  };

  const streamSupportAiChat = async (userMessage: string, allMessages: SupportMessage[]) => {
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

      if (!response.ok) throw new Error("Erreur du service");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();
      let buffer = "";
      const tempUsageId = `temp_${Date.now()}`;

      setSupportMessages(prev => [...prev, { role: "assistant", content: "", source: "ai", usageId: tempUsageId }]);

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
              setSupportMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent, source: "ai", usageId: usageId || tempUsageId };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch (error) {
      toast.error("Erreur lors de l'envoi du message");
      setSupportMessages(prev => prev.filter((_, i) => i !== prev.length - 1));
    }
  };

  const handleSupportSend = async () => {
    if (!supportInput.trim() || supportLoading) return;
    const message = supportInput.trim();
    setSupportInput("");
    
    if (requestHuman && conversationId) {
      sendHumanMessage(message);
      return;
    }

    const userMsg: SupportMessage = { role: "user", content: message };
    setSupportMessages(prev => [...prev, userMsg]);
    setSupportLoading(true);
    setLastFaqQuery(message);

    try {
      if (aiModeEnabled) {
        await streamSupportAiChat(message, [...supportMessages, userMsg]);
      } else {
        const faqResult = await searchFaq(message);
        if (faqResult.found && faqResult.answer) {
          const processedAnswer = replaceConfigVariables(faqResult.answer, configMap);
          setSupportMessages(prev => [...prev, { role: "faq", content: processedAnswer, source: "faq" }]);
        } else {
          await streamSupportAiChat(message, [...supportMessages, userMsg]);
        }
      }
    } catch (error) {
      toast.error("Erreur lors de l'envoi du message");
    } finally {
      setSupportLoading(false);
    }
  };

  const handleRetryWithAi = async () => {
    if (!lastFaqQuery || supportLoading) return;
    setSupportLoading(true);
    try {
      await streamSupportAiChat(lastFaqQuery, supportMessages);
    } finally {
      setSupportLoading(false);
      setLastFaqQuery(null);
    }
  };

  const sendHumanMessage = async (content: string) => {
    if (!conversationId || !user) return;
    setSupportMessages(prev => [...prev, { role: "user", content }]);
    try {
      await supabase.from('support_messages').insert({
        conversation_id: conversationId,
        sender_type: 'user',
        sender_id: user.id,
        content
      });
    } catch {
      toast.error("Erreur lors de l'envoi");
    }
  };

  const handleRequestHuman = async () => {
    setRequestHuman(true);
    if (user) {
      try {
        const { data: conv, error: convError } = await supabase.from('support_conversations').insert({
          user_id: user.id,
          status: 'pending'
        }).select().single();
        if (convError) throw convError;

        if (conv && supportMessages.length > 0) {
          const messagesToInsert = supportMessages.filter(m => m.role !== "system").map(m => ({
            conversation_id: conv.id,
            sender_type: m.role === 'user' ? 'user' : 'bot',
            sender_id: m.role === 'user' ? user.id : null,
            content: m.content
          }));
          await supabase.from('support_messages').insert(messagesToInsert);
        }

        try {
          await supabase.functions.invoke('notify-support-request', {
            body: {
              conversationId: conv.id,
              userId: user.id,
              messages: supportMessages.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.content }))
            }
          });
        } catch {}
        
        setConversationId(conv.id);
        toast.success("Demande envoyée ! Un agent vous contactera bientôt.");
      } catch {
        toast.error("Erreur lors de l'envoi de la demande");
      }
    } else {
      toast.info("Connectez-vous pour demander une assistance humaine");
    }
  };

  const clearSupportHistory = () => {
    setSupportMessages([]);
    setRequestHuman(false);
    setConversationId(null);
    rgpdProcessedRef.current = null;
    localStorage.removeItem(SUPPORT_STORAGE_KEY);
  };

  const rateMessage = async (messageIndex: number, rating: "positive" | "negative") => {
    const message = supportMessages[messageIndex];
    if (!message.usageId || message.rated) return;
    
    try {
      await supabase.functions.invoke("chatbot-feedback", {
        body: { 
          queryText: supportMessages[messageIndex - 1]?.content || "",
          responsePreview: message.content.slice(0, 100),
          rating,
          source: message.source || "ai"
        }
      });
      
      setSupportMessages(prev => {
        const updated = [...prev];
        updated[messageIndex] = { ...updated[messageIndex], rated: true };
        return updated;
      });
      
      toast.success(rating === "positive" ? "Merci pour votre feedback !" : "Merci, nous améliorerons cette réponse");
    } catch {}
  };

  const getSupportMessageIcon = (message: SupportMessage) => {
    if (message.role === "user") return <User className="w-4 h-4" />;
    if (message.role === "agent") return <UserCog className="w-4 h-4" />;
    if (message.role === "system") return <FileText className="w-4 h-4" />;
    if (message.source === "faq") return <BookOpen className="w-4 h-4" />;
    return <Sparkles className="w-4 h-4" />;
  };

  const getSupportMessageStyle = (message: SupportMessage) => {
    if (message.role === "user") return "bg-primary text-primary-foreground rounded-br-sm";
    if (message.role === "agent") return "bg-green-500/20 text-foreground rounded-bl-sm";
    if (message.role === "system") return "bg-amber-500/20 text-foreground rounded-bl-sm";
    if (message.source === "faq") return "bg-blue-500/20 text-foreground rounded-bl-sm";
    return "bg-muted rounded-bl-sm";
  };

  const getSupportAvatarStyle = (message: SupportMessage) => {
    if (message.role === "user") return "bg-primary text-primary-foreground";
    if (message.role === "agent") return "bg-green-500 text-white";
    if (message.role === "system") return "bg-amber-500 text-white";
    if (message.source === "faq") return "bg-blue-500 text-white";
    return "bg-muted";
  };

  const lastSupportMessageIsFaq = supportMessages.length > 0 && supportMessages[supportMessages.length - 1].source === "faq";

  if (!user) return null;

  return (
    <>
      {/* Toggle Buttons - Top Right */}
      <div className={cn(
        "fixed top-4 right-4 z-50 flex flex-col gap-3 transition-all duration-300",
        isOpen && "scale-0 opacity-0"
      )}>
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-12 w-12 rounded-full shadow-lg",
            "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
          )}
          size="icon"
        >
          <Sparkles className="h-5 w-5 text-white" />
        </Button>
        <Button
          onClick={() => window.location.href = "mailto:support@anr.fr"}
          className={cn(
            "h-12 w-12 rounded-full shadow-lg",
            "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
          )}
          size="icon"
        >
          <Mail className="h-5 w-5 text-white" />
        </Button>
      </div>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed top-4 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)]",
          "bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden",
          "transition-all duration-300 origin-top-right",
          isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
        )}
        style={{ height: "min(600px, calc(100vh - 100px))" }}
      >
        {/* Header with Tabs */}
        <div className="border-b">
          <div className="flex items-center justify-between px-4 pt-3">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "copilot" | "support")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-9">
                <TabsTrigger value="copilot" className="text-xs gap-1.5">
                  <Compass className="h-3.5 w-3.5" />
                  Co-Pilot
                </TabsTrigger>
                <TabsTrigger value="support" className="text-xs gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Support
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="ml-2 -mr-2">
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Sub-header */}
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-full",
                activeTab === "copilot" 
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500" 
                  : "bg-primary/20"
              )}>
                {activeTab === "copilot" ? (
                  <Compass className="h-3.5 w-3.5 text-white" />
                ) : (
                  requestHuman ? <UserCog className="h-3.5 w-3.5 text-primary" /> : <Bot className="h-3.5 w-3.5 text-primary" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-sm">
                  {activeTab === "copilot" ? "ANR Co-Pilot" : "Support Clients"}
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  {activeTab === "copilot" ? "Votre guide personnel" : "Nous sommes là pour vous aider"}
                </p>
              </div>
            </div>
            {((activeTab === "copilot" && copilotMessages.length > 0) || (activeTab === "support" && supportMessages.length > 0)) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={activeTab === "copilot" ? clearCopilotHistory : clearSupportHistory}
                title="Nouvelle conversation"
                className="h-8 w-8"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {activeTab === "copilot" ? (
            <>
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {copilotMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <div className="p-4 rounded-full bg-gradient-to-r from-blue-600/20 to-cyan-500/20 mb-4">
                      <Sparkles className="h-8 w-8 text-blue-600" />
                    </div>
                    <h4 className="font-medium mb-2">Bienvenue sur Co-Pilot !</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Je suis là pour vous guider pas à pas dans l'application ANR.
                    </p>
                    <div className="space-y-2 w-full">
                      <Button variant="outline" size="sm" className="w-full text-xs justify-start" onClick={() => streamCopilotChat("Comment programmer un accès ?")}>
                        💡 Programmer un accès
                      </Button>
                      <Button variant="outline" size="sm" className="w-full text-xs justify-start" onClick={() => streamCopilotChat("Comment inviter un autre résident ?")}>
                        💡 Inviter un autre résident
                      </Button>
                      <Button variant="outline" size="sm" className="w-full text-xs justify-start" onClick={() => streamCopilotChat("Comment partager mon code ANR ?")}>
                        💡 Partager mon code ANR
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {copilotMessages.map((msg, idx) => (
                      <div key={idx} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                          msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"
                        )}>
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        </div>
                      </div>
                    ))}
                    {copilotLoading && copilotMessages[copilotMessages.length - 1]?.role === "user" && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
              
              <div className="p-4 border-t">
                <div className="flex items-center gap-2">
                  <Input
                    ref={inputRef}
                    value={copilotInput}
                    onChange={(e) => setCopilotInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleCopilotSend())}
                    placeholder="Posez votre question..."
                    disabled={copilotLoading}
                    className="flex-1"
                  />
                  <Button onClick={handleCopilotSend} disabled={!copilotInput.trim() || copilotLoading} size="icon" className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600">
                    {copilotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {supportMessages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">Bonjour ! Comment puis-je vous aider ?</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {supportMessages.map((message, index) => (
                      <div key={index}>
                        <div className={cn("flex gap-3", message.role === "user" ? "flex-row-reverse" : "")}>
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", getSupportAvatarStyle(message))}>
                            {getSupportMessageIcon(message)}
                          </div>
                          <div className={cn("max-w-[80%] rounded-2xl px-4 py-2 text-sm", getSupportMessageStyle(message))}>
                            {message.source && message.role !== "user" && message.role !== "system" && (
                              <div className="text-[10px] font-medium opacity-70 mb-1 flex items-center gap-1">
                                {message.source === "faq" ? (
                                  <><BookOpen className="w-3 h-3" /> Réponse de notre FAQ</>
                                ) : (
                                  <><Sparkles className="w-3 h-3" /> Assistant IA</>
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

                        {(message.source === "ai" || message.source === "faq") && message.content && !message.rated && (
                          <div className="mt-2 ml-11 flex gap-1">
                            <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-muted-foreground hover:text-green-600 hover:bg-green-500/10" onClick={() => rateMessage(index, "positive")}>
                              <ThumbsUp className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-muted-foreground hover:text-red-600 hover:bg-red-500/10" onClick={() => rateMessage(index, "negative")}>
                              <ThumbsDown className="w-3 h-3" />
                            </Button>
                            {message.source === "faq" && index === supportMessages.length - 1 && !supportLoading && (
                              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1.5 text-muted-foreground hover:text-foreground ml-1" onClick={handleRetryWithAi}>
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
                )}
              </ScrollArea>

              {!requestHuman && supportMessages.length > 0 && !lastSupportMessageIsFaq && (
                <div className="px-4 py-2 border-t">
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

              <div className="p-4 border-t">
                <form onSubmit={(e) => { e.preventDefault(); handleSupportSend(); }} className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={supportInput}
                    onChange={e => setSupportInput(e.target.value)}
                    placeholder="Écrivez votre message..."
                    disabled={supportLoading}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!supportInput.trim() || supportLoading}>
                    {supportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default UnifiedAssistant;
