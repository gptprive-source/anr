import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Search, Filter, User, Building2, Inbox, MailOpen, Mail as MailClosed, ChevronRight, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useVisitorMessages } from "@/hooks/useVisitorMessages";
import { useBlockedVisitors } from "@/hooks/useBlockedVisitors";
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
  avatarUrl: string | null;
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
  const { isBlocked, blockedVisitors, unblockVisitor } = useBlockedVisitors();
  const [showBlocked, setShowBlocked] = useState(false);

  // Group messages by visitor
  const groupedConversations = useMemo(() => {
    const groups = new Map<string, GroupedConversation>();

    messages.forEach((msg) => {
      // Use business_card_id or visitor_phone as unique visitor identifier
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
        // Update with latest info
        if (new Date(msg.created_at) > existing.lastMessageDate) {
          existing.lastMessage = msg.message || (msg.voice_message_url ? "🎤 Message vocal" : null);
          existing.lastMessageDate = new Date(msg.created_at);
          existing.hasReply = msg.has_reply || existing.hasReply;
        }
        if (!msg.is_read) {
          existing.unreadCount++;
        }
        existing.totalMessages++;
        // Keep the most complete business card
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
          avatarUrl: card?.avatar_url || null,
        });
      }
    });

    // Sort by last message date descending
    return Array.from(groups.values()).sort(
      (a, b) => b.lastMessageDate.getTime() - a.lastMessageDate.getTime()
    );
  }, [messages]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return groupedConversations.filter((conv) => {
      // Filter out blocked visitors
      if (isBlocked(conv.visitorId)) return false;

      // Status filter
      if (statusFilter === "unread" && conv.unreadCount === 0) return false;
      if (statusFilter === "read" && conv.unreadCount > 0) return false;

      // Date filter
      if (dateFilter === "today" && !isToday(conv.lastMessageDate)) return false;
      if (dateFilter === "week" && !isThisWeek(conv.lastMessageDate, { weekStartsOn: 1 })) return false;
      if (dateFilter === "month" && !isThisMonth(conv.lastMessageDate)) return false;

      // Search filter
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
  }, [groupedConversations, statusFilter, dateFilter, searchQuery, isBlocked]);

  if (loadingHabitation || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!habitationId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
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
  const readCount = totalMessages - unreadCount;

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4 pt-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-500" />
              Messages
            </h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center border border-blue-500">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Inbox className="w-4 h-4 text-blue-500" />
              </div>
            </div>
            <p className="text-2xl font-bold">{totalConversations}</p>
            <span className="text-xs text-muted-foreground">Conversations</span>
          </Card>
          <Card className="p-3 text-center border border-red-500">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                <MailClosed className="w-4 h-4 text-red-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-red-500">{unreadCount}</p>
            <span className="text-xs text-muted-foreground">Non lus</span>
          </Card>
          <Card className="p-3 text-center border border-green-500">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <MailOpen className="w-4 h-4 text-green-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-green-500">{totalMessages}</p>
            <span className="text-xs text-muted-foreground">Total msgs</span>
          </Card>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter row */}
          <div className="flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[130px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="unread">Non lus</SelectItem>
                <SelectItem value="read">Lus</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes dates</SelectItem>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
              </SelectContent>
            </Select>

            {blockedVisitors.length > 0 && (
              <Button
                variant={showBlocked ? "default" : "outline"}
                size="sm"
                onClick={() => setShowBlocked(!showBlocked)}
                className="gap-2"
              >
                <Ban className="w-4 h-4" />
                Bloqués ({blockedVisitors.length})
              </Button>
            )}
          </div>
        </div>

        {/* Blocked visitors section */}
        {showBlocked && blockedVisitors.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Ban className="w-4 h-4" />
              Visiteurs bloqués
            </h3>
            {blockedVisitors.map((blocked) => (
              <Card key={blocked.id} className="border border-red-500/50 bg-red-500/5">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                      <Ban className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {blocked.visitor_name || "Visiteur anonyme"}
                      </p>
                      {blocked.reason && (
                        <p className="text-xs text-muted-foreground">{blocked.reason}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => unblockVisitor(blocked.visitor_identifier)}
                  >
                    Débloquer
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Conversations list */}
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {groupedConversations.length === 0 ? "Aucun message" : "Aucun résultat"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredConversations.map((conv, index) => {
              const preview = conv.lastMessage 
                ? conv.lastMessage.substring(0, 50) + (conv.lastMessage.length > 50 ? "..." : "")
                : "";

              // Cycle through colors: blue, orange, yellow, purple, pink, green, cyan
              const colorCycle = ["border-blue-500", "border-orange-500", "border-yellow-500", "border-purple-500", "border-pink-500", "border-green-500", "border-cyan-500"];
              const borderColor = colorCycle[index % colorCycle.length];

              return (
                <Card
                  key={conv.visitorId}
                  className={`cursor-pointer transition-all border ${conv.unreadCount > 0 ? "border-primary bg-primary/5" : borderColor}`}
                  onClick={() => navigate(`/conversation/${conv.visitorId}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <Avatar className="h-11 w-11 flex-shrink-0">
                        {conv.avatarUrl ? (
                          <AvatarImage src={conv.avatarUrl} alt={conv.displayName} />
                        ) : null}
                        <AvatarFallback className={conv.isCompany ? "bg-orange-500/10" : "bg-purple-500/10"}>
                          {conv.isCompany ? (
                            <Building2 className="w-5 h-5 text-orange-500" />
                          ) : (
                            <User className="w-5 h-5 text-purple-500" />
                          )}
                        </AvatarFallback>
                      </Avatar>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate text-foreground">
                            {conv.displayName}
                          </p>
                          <span className="text-xs text-foreground/70 flex-shrink-0">
                            {formatDistanceToNow(conv.lastMessageDate, {
                              addSuffix: false,
                              locale: fr,
                            })}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm truncate text-foreground/80">
                            {conv.hasReply && (
                              <span className="text-primary mr-1">↩</span>
                            )}
                            {preview}
                          </p>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-2 mt-2">
                          {conv.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs h-5">
                              {conv.unreadCount} nouveau{conv.unreadCount > 1 ? "x" : ""}
                            </Badge>
                          )}
                          {conv.totalMessages > 1 && (
                            <Badge variant="secondary" className="text-xs h-5">
                              {conv.totalMessages} messages
                            </Badge>
                          )}
                          {conv.hasReply && (
                            <Badge variant="outline" className="text-xs h-5 text-green-600 border-green-600">
                              Répondu
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
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
