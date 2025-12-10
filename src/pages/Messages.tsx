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
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* Header with shadow */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/dashboard")}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-foreground">Messages</h1>
                <p className="text-xs text-muted-foreground">{totalConversations} conversation{totalConversations > 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl p-4 border border-border card-shadow">
            <div className="flex items-center justify-center mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Inbox className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-center text-foreground">{totalConversations}</p>
            <p className="text-xs text-center text-muted-foreground">Conversations</p>
          </div>
          
          <div className="bg-card rounded-xl p-4 border border-border card-shadow">
            <div className="flex items-center justify-center mb-2">
              <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                <MailClosed className="w-4 h-4 text-destructive" />
              </div>
            </div>
            <p className="text-2xl font-bold text-center text-destructive">{unreadCount}</p>
            <p className="text-xs text-center text-muted-foreground">Non lus</p>
          </div>
          
          <div className="bg-card rounded-xl p-4 border border-border card-shadow">
            <div className="flex items-center justify-center mb-2">
              <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                <MailOpen className="w-4 h-4 text-success" />
              </div>
            </div>
            <p className="text-2xl font-bold text-center text-success">{totalMessages}</p>
            <p className="text-xs text-center text-muted-foreground">Total msgs</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un contact ou message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border focus:ring-primary"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[130px] bg-card border-border">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="unread">Non lus</SelectItem>
                <SelectItem value="read">Lus</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="w-[140px] bg-card border-border">
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
        </div>

        {/* Conversations List - WhatsApp Style */}
        {filteredConversations.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">
              {groupedConversations.length === 0 ? "Aucun message" : "Aucun résultat"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {groupedConversations.length === 0 
                ? "Les messages de vos visiteurs apparaîtront ici" 
                : "Essayez avec d'autres termes de recherche"}
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden card-shadow">
            {filteredConversations.map((conv, index) => {
              const preview = conv.lastMessage 
                ? conv.lastMessage.substring(0, 45) + (conv.lastMessage.length > 45 ? "..." : "")
                : "";
              const isVoice = conv.lastMessage?.startsWith("🎤");

              return (
                <div
                  key={conv.visitorId}
                  className={`
                    flex items-center gap-3 p-4 cursor-pointer transition-all
                    hover:bg-muted/50 active:bg-muted
                    ${conv.unreadCount > 0 ? "bg-primary/5" : ""}
                    ${index !== 0 ? "border-t border-border" : ""}
                  `}
                  onClick={() => navigate(`/conversation/${conv.visitorId}`)}
                >
                  {/* Unread indicator bar */}
                  {conv.unreadCount > 0 && (
                    <div className="absolute left-0 w-1 h-full bg-primary rounded-r" />
                  )}

                  {/* Avatar */}
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                    ${conv.isCompany ? "bg-accent/10" : "bg-primary/10"}
                  `}>
                    {conv.isCompany ? (
                      <Building2 className="w-6 h-6 text-accent" />
                    ) : (
                      <User className="w-6 h-6 text-primary" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-semibold truncate ${conv.unreadCount > 0 ? "text-foreground" : "text-foreground/80"}`}>
                        {conv.displayName}
                      </p>
                      <span className={`text-xs flex-shrink-0 ${conv.unreadCount > 0 ? "text-primary font-medium" : "text-muted-foreground"}`}>
                        {formatDistanceToNow(conv.lastMessageDate, {
                          addSuffix: false,
                          locale: fr,
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <div className="flex items-center gap-1 min-w-0">
                        {conv.hasReply && (
                          <span className="text-success text-sm">✓✓</span>
                        )}
                        {isVoice && (
                          <Mic className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <p className={`text-sm truncate ${conv.unreadCount > 0 ? "text-foreground/70 font-medium" : "text-muted-foreground"}`}>
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

                    {/* Job title for companies */}
                    {conv.jobTitle && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {conv.jobTitle}
                      </p>
                    )}
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
