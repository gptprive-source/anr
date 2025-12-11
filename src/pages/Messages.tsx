import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Search, Filter, User, Building2, Inbox, MailOpen, Mail as MailClosed, ChevronRight, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useVisitorMessages } from "@/hooks/useVisitorMessages";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, isToday, isThisWeek, isThisMonth } from "date-fns";
import { fr } from "date-fns/locale";
import BottomNav from "@/components/layout/BottomNav";
import { Loader2 } from "lucide-react";

type StatusFilter = "all" | "unread" | "read";
type DateFilter = "all" | "today" | "week" | "month";

interface GroupedConversation {
  visitorId: string;
  displayName: string;
  isCompany: boolean;
  jobTitle: string | null;
  lastMessage: string | null;
  lastMessageDate: Date;
  unreadCount: number;
  totalMessages: number;
  hasReply: boolean;
  businessCard: any | null;
}

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [habitationId, setHabitationId] = useState<string | null>(null);
  const [loadingHabitation, setLoadingHabitation] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch habitation ID for current user
  useEffect(() => {
    const fetchHabitation = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("residents")
        .select("habitation_id")
        .eq("user_id", user.id)
        .eq("status", "verified")
        .maybeSingle();
      
      if (data?.habitation_id) {
        setHabitationId(data.habitation_id);
      }
      setLoadingHabitation(false);
    };
    
    fetchHabitation();
  }, [user]);

  const { messages, unreadCount, loading } = useVisitorMessages(habitationId || "");

  // Group messages by visitor
  const groupedConversations = useMemo(() => {
    const groups = new Map<string, GroupedConversation>();

    messages.forEach((msg) => {
      const visitorId = msg.business_card_id || msg.visitor_phone || `anon-${msg.id}`;
      
      const existing = groups.get(visitorId);
      const card = msg.business_card;
      const isCompany = card?.card_type === "company";
      const displayName = card
        ? isCompany
          ? card.company_name || "Entreprise"
          : `${card.first_name || ""} ${card.last_name || ""}`.trim() || "Visiteur"
        : msg.visitor_phone || "Visiteur";

      if (existing) {
        if (new Date(msg.created_at) > existing.lastMessageDate) {
          existing.lastMessage = msg.message || (msg.voice_message_url ? "🎤 Message vocal" : null);
          existing.lastMessageDate = new Date(msg.created_at);
          existing.hasReply = msg.has_reply || existing.hasReply;
        }
        if (!msg.is_read) {
          existing.unreadCount++;
        }
        existing.totalMessages++;
        if (card && !existing.businessCard) {
          existing.businessCard = card;
          existing.displayName = displayName;
          existing.isCompany = isCompany;
          existing.jobTitle = card.job_title;
        }
      } else {
        groups.set(visitorId, {
          visitorId,
          displayName,
          isCompany,
          jobTitle: card?.job_title || null,
          lastMessage: msg.message || (msg.voice_message_url ? "🎤 Message vocal" : null),
          lastMessageDate: new Date(msg.created_at),
          unreadCount: msg.is_read ? 0 : 1,
          totalMessages: 1,
          hasReply: msg.has_reply || false,
          businessCard: card || null,
        });
      }
    });

    return Array.from(groups.values()).sort(
      (a, b) => b.lastMessageDate.getTime() - a.lastMessageDate.getTime()
    );
  }, [messages]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return groupedConversations.filter((conv) => {
      if (statusFilter === "unread" && conv.unreadCount === 0) return false;
      if (statusFilter === "read" && conv.unreadCount > 0) return false;

      if (dateFilter === "today" && !isToday(conv.lastMessageDate)) return false;
      if (dateFilter === "week" && !isThisWeek(conv.lastMessageDate, { weekStartsOn: 1 })) return false;
      if (dateFilter === "month" && !isThisMonth(conv.lastMessageDate)) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = conv.displayName.toLowerCase().includes(query);
        const matchesMessage = conv.lastMessage?.toLowerCase().includes(query);
        const matchesJob = conv.jobTitle?.toLowerCase().includes(query);
        
        if (!matchesName && !matchesMessage && !matchesJob) {
          return false;
        }
      }

      return true;
    });
  }, [groupedConversations, statusFilter, dateFilter, searchQuery]);

  if (loadingHabitation || loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="glass-card p-6">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      </div>
    );
  }

  if (!habitationId) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <div className="glass-card text-center p-8">
          <p className="text-card-foreground">Aucune habitation trouvée</p>
          <Button className="mt-4" onClick={() => navigate("/dashboard")}>
            Retour
          </Button>
        </div>
      </div>
    );
  }

  const totalMessages = messages.length;
  const totalConversations = groupedConversations.length;

  return (
    <div className="min-h-screen gradient-bg pb-24">
      {/* Header - Glassmorphism */}
      <div className="glass-header sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/dashboard")}
              className="text-white/90 hover:text-white hover:bg-white/10 rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-bold text-xl text-white">Messages</h1>
              <p className="text-xs text-white/70">{totalConversations} conversation{totalConversations > 1 ? 's' : ''}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Stats Cards - Glassmorphism */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Inbox className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-card-foreground">{totalConversations}</p>
            <span className="text-xs text-muted-foreground">Conversations</span>
          </div>
          
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                <MailClosed className="w-4 h-4 text-red-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-red-500">{unreadCount}</p>
            <span className="text-xs text-muted-foreground">Non lus</span>
          </div>
          
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <MailOpen className="w-4 h-4 text-green-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-card-foreground">{totalMessages}</p>
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
        </div>

        {/* Search - Glassmorphism */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 glass-input border-0 rounded-full text-card-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Filters - Glassmorphism */}
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="flex-1 glass-input border-0 rounded-full h-11 text-card-foreground">
              <Filter className="w-4 h-4 mr-2 text-blue-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-card border-0">
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="unread">Non lus</SelectItem>
              <SelectItem value="read">Lus</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="flex-1 glass-input border-0 rounded-full h-11 text-card-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-card border-0">
              <SelectItem value="all">Toutes dates</SelectItem>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Conversations List - Glassmorphism */}
        {filteredConversations.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-10 h-10 text-blue-500" />
            </div>
            <p className="text-card-foreground font-semibold text-lg">
              {groupedConversations.length === 0 ? "Aucun message" : "Aucun résultat"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {groupedConversations.length === 0
                ? "Les messages de vos visiteurs apparaîtront ici" 
                : "Essayez avec d'autres termes de recherche"}
            </p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            {filteredConversations.map((conv, index) => {
              const preview = conv.lastMessage 
                ? conv.lastMessage.substring(0, 50) + (conv.lastMessage.length > 50 ? "..." : "")
                : "";
              const isVoice = conv.lastMessage?.startsWith("🎤");

              return (
                <div
                  key={conv.visitorId}
                  className={`
                    relative flex items-center gap-4 px-4 py-4 cursor-pointer transition-all duration-200
                    hover:bg-white/50 active:bg-white/70
                    ${index !== 0 ? "border-t border-white/20" : ""}
                  `}
                  onClick={() => navigate(`/conversation/${conv.visitorId}`)}
                >
                  {/* Avatar with white border */}
                  <div className={`
                    w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-white shadow-lg
                    ${conv.unreadCount > 0 
                      ? "bg-gradient-to-br from-blue-400 to-blue-600" 
                      : "bg-gradient-to-br from-gray-200 to-gray-300"}
                  `}>
                    {conv.isCompany ? (
                      <Building2 className={`w-6 h-6 ${conv.unreadCount > 0 ? "text-white" : "text-gray-500"}`} />
                    ) : (
                      <User className={`w-6 h-6 ${conv.unreadCount > 0 ? "text-white" : "text-gray-500"}`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-semibold truncate ${conv.unreadCount > 0 ? "text-card-foreground" : "text-muted-foreground"}`}>
                        {conv.displayName}
                      </p>
                      <span className={`text-xs flex-shrink-0 ${conv.unreadCount > 0 ? "text-blue-500 font-semibold" : "text-muted-foreground"}`}>
                        {formatDistanceToNow(conv.lastMessageDate, {
                          addSuffix: false,
                          locale: fr,
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {conv.hasReply && (
                          <span className="text-blue-500 text-xs font-bold">✓✓</span>
                        )}
                        {isVoice && (
                          <Mic className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        )}
                        <p className={`text-sm truncate ${conv.unreadCount > 0 ? "text-card-foreground/80" : "text-muted-foreground"}`}>
                          {isVoice ? "Message vocal" : preview}
                        </p>
                      </div>
                      
                      {/* Unread badge - Gradient blue */}
                      {conv.unreadCount > 0 && (
                        <span className="bg-gradient-to-r from-blue-400 to-blue-600 text-white text-xs font-bold rounded-full min-w-[24px] h-6 px-2 flex items-center justify-center flex-shrink-0 shadow-md">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-blue-400 flex-shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Messages;
