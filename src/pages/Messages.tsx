import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Search, Filter, User, Building2, Inbox, MailOpen, Mail as MailClosed, ChevronRight, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!habitationId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground">Aucune habitation trouvée</p>
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
    <div className="min-h-screen bg-background pb-20">
      {/* Header - WhatsApp style blue */}
      <div className="bg-primary text-primary-foreground sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/dashboard")}
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-bold text-xl">Messages</h1>
              <p className="text-xs text-primary-foreground/70">{totalConversations} conversation{totalConversations > 1 ? 's' : ''}</p>
            </div>
            <MessageSquare className="w-6 h-6 text-primary-foreground/80" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Inbox className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Conversations</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalConversations}</p>
          </div>
          
          <div className="bg-card rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <MailClosed className="w-4 h-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Non lus</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{unreadCount}</p>
          </div>
          
          <div className="bg-card rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <MailOpen className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalMessages}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-0 shadow-sm rounded-full"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="flex-1 bg-card border-0 shadow-sm rounded-full h-9 text-sm">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="unread">Non lus</SelectItem>
              <SelectItem value="read">Lus</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="flex-1 bg-card border-0 shadow-sm rounded-full h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes dates</SelectItem>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Conversations List */}
        {filteredConversations.length === 0 ? (
          <div className="bg-card rounded-2xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
            <p className="text-foreground font-medium">
              {groupedConversations.length === 0 ? "Aucun message" : "Aucun résultat"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {groupedConversations.length === 0
                ? "Les messages de vos visiteurs apparaîtront ici" 
                : "Essayez avec d'autres termes de recherche"}
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl overflow-hidden shadow-sm">
            {filteredConversations.map((conv, index) => {
              const preview = conv.lastMessage 
                ? conv.lastMessage.substring(0, 50) + (conv.lastMessage.length > 50 ? "..." : "")
                : "";
              const isVoice = conv.lastMessage?.startsWith("🎤");

              return (
                <div
                  key={conv.visitorId}
                  className={`
                    relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                    hover:bg-muted/30 active:bg-muted/50
                    ${index !== 0 ? "border-t border-border/50" : ""}
                  `}
                  onClick={() => navigate(`/conversation/${conv.visitorId}`)}
                >
                  {/* Avatar */}
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                    ${conv.unreadCount > 0 ? "bg-primary" : "bg-muted"}
                  `}>
                    {conv.isCompany ? (
                      <Building2 className={`w-5 h-5 ${conv.unreadCount > 0 ? "text-primary-foreground" : "text-muted-foreground"}`} />
                    ) : (
                      <User className={`w-5 h-5 ${conv.unreadCount > 0 ? "text-primary-foreground" : "text-muted-foreground"}`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-semibold truncate ${conv.unreadCount > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                        {conv.displayName}
                      </p>
                      <span className={`text-xs flex-shrink-0 ${conv.unreadCount > 0 ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                        {formatDistanceToNow(conv.lastMessageDate, {
                          addSuffix: false,
                          locale: fr,
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {conv.hasReply && (
                          <span className="text-primary text-xs">✓✓</span>
                        )}
                        {isVoice && (
                          <Mic className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        )}
                        <p className={`text-sm truncate ${conv.unreadCount > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                          {isVoice ? "Message vocal" : preview}
                        </p>
                      </div>
                      
                      {/* Unread badge */}
                      {conv.unreadCount > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center flex-shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
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
