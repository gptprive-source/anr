import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Search, Filter, Trash2, Phone, Mail, User, Building2, Briefcase, MapPin, Inbox, MailOpen, Mail as MailClosed, Mic, MessageCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useVisitorMessages } from "@/hooks/useVisitorMessages";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, isToday, isThisWeek, isThisMonth } from "date-fns";
import { fr } from "date-fns/locale";
import BottomNav from "@/components/layout/BottomNav";
import { Loader2 } from "lucide-react";

type StatusFilter = "all" | "unread" | "read";
type DateFilter = "all" | "today" | "week" | "month";

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
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

  // Filter messages
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      // Status filter
      if (statusFilter === "unread" && msg.is_read) return false;
      if (statusFilter === "read" && !msg.is_read) return false;

      // Date filter
      const msgDate = new Date(msg.created_at);
      if (dateFilter === "today" && !isToday(msgDate)) return false;
      if (dateFilter === "week" && !isThisWeek(msgDate, { weekStartsOn: 1 })) return false;
      if (dateFilter === "month" && !isThisMonth(msgDate)) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const card = msg.business_card;
        const matchesMessage = msg.message?.toLowerCase().includes(query) ?? false;
        const matchesPhone = msg.visitor_phone?.toLowerCase().includes(query);
        const matchesCardName = card
          ? `${card.first_name || ""} ${card.last_name || ""} ${card.company_name || ""}`.toLowerCase().includes(query)
          : false;
        const matchesCardPhone = card?.phone?.toLowerCase().includes(query);
        const matchesCardEmail = card?.email?.toLowerCase().includes(query);
        
        if (!matchesMessage && !matchesPhone && !matchesCardName && !matchesCardPhone && !matchesCardEmail) {
          return false;
        }
      }

      return true;
    });
  }, [messages, statusFilter, dateFilter, searchQuery]);

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
  const readCount = totalMessages - unreadCount;

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 pt-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-xl flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-primary" />
              Messages
            </h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
              <Inbox className="w-4 h-4" />
              <span className="text-xs">Total</span>
            </div>
            <p className="text-2xl font-bold">{totalMessages}</p>
          </Card>
          <Card className="p-3 text-center">
            <div className="flex items-center justify-center gap-2 text-destructive mb-1">
              <MailClosed className="w-4 h-4" />
              <span className="text-xs">Non lus</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{unreadCount}</p>
          </Card>
          <Card className="p-3 text-center">
            <div className="flex items-center justify-center gap-2 text-success mb-1">
              <MailOpen className="w-4 h-4" />
              <span className="text-xs">Lus</span>
            </div>
            <p className="text-2xl font-bold text-success">{readCount}</p>
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
          </div>
        </div>

        {/* Conversations list */}
        {filteredMessages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {messages.length === 0 ? "Aucun message" : "Aucun résultat"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMessages.map((msg) => {
              const card = msg.business_card;
              const isCompany = card?.card_type === "company";
              const displayName = card
                ? isCompany
                  ? card.company_name
                  : `${card.first_name || ""} ${card.last_name || ""}`.trim()
                : msg.visitor_phone || "Visiteur";

              const preview = msg.message 
                ? msg.message.substring(0, 60) + (msg.message.length > 60 ? "..." : "")
                : msg.voice_message_url 
                  ? "🎤 Message vocal"
                  : "";

              return (
                <Card
                  key={msg.id}
                  className={`cursor-pointer transition-all hover:bg-accent/50 ${!msg.is_read ? "border-primary/50 bg-primary/5" : ""}`}
                  onClick={() => navigate(`/conversation/${msg.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className={`p-2 rounded-full flex-shrink-0 ${!msg.is_read ? "bg-primary/20" : "bg-muted"}`}>
                        {isCompany ? (
                          <Building2 className={`w-5 h-5 ${!msg.is_read ? "text-primary" : "text-muted-foreground"}`} />
                        ) : (
                          <User className={`w-5 h-5 ${!msg.is_read ? "text-primary" : "text-muted-foreground"}`} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`font-medium truncate ${!msg.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                            {displayName}
                          </p>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatDistanceToNow(new Date(msg.created_at), {
                              addSuffix: false,
                              locale: fr,
                            })}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <p className={`text-sm truncate ${!msg.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                            {msg.has_reply && (
                              <span className="text-primary mr-1">↩</span>
                            )}
                            {preview}
                          </p>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-2 mt-2">
                          {!msg.is_read && (
                            <Badge variant="destructive" className="text-xs h-5">
                              Nouveau
                            </Badge>
                          )}
                          {msg.has_reply && (
                            <Badge variant="outline" className="text-xs h-5 text-green-600 border-green-600">
                              Répondu
                            </Badge>
                          )}
                          {card?.job_title && (
                            <Badge variant="secondary" className="text-xs h-5">
                              {card.job_title}
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
