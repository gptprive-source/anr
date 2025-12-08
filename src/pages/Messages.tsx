import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Search, Filter, Check, Trash2, Phone, Mail, User, Building2, Briefcase, MapPin, Inbox, MailOpen, Mail as MailClosed, Mic } from "lucide-react";
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
import { useEffect } from "react";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const { messages, unreadCount, loading, markAsRead, deleteMessage } = useVisitorMessages(habitationId || "");

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

  const handleMarkAsRead = async (messageId: string) => {
    const result = await markAsRead(messageId);
    if (!result.success) {
      toast({
        title: "Erreur",
        description: "Impossible de marquer comme lu",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (messageId: string) => {
    setDeletingId(messageId);
    const result = await deleteMessage(messageId);
    if (result.success) {
      toast({ title: "Message supprimé" });
    } else {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le message",
        variant: "destructive",
      });
    }
    setDeletingId(null);
  };

  const handleMarkAllAsRead = async () => {
    const unreadMessages = messages.filter(m => !m.is_read);
    for (const msg of unreadMessages) {
      await markAsRead(msg.id);
    }
    toast({ title: `${unreadMessages.length} message(s) marqué(s) comme lu(s)` });
  };

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
              Messages visiteurs
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
              placeholder="Rechercher un message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter row */}
          <div className="flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[140px]">
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
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes dates</SelectItem>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
              </SelectContent>
            </Select>

            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} className="ml-auto">
                <Check className="w-4 h-4 mr-1" />
                Tout marquer lu
              </Button>
            )}
          </div>
        </div>

        {/* Messages list */}
        {filteredMessages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {messages.length === 0 ? "Aucun message" : "Aucun message correspondant aux filtres"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMessages.map((msg) => {
              const card = msg.business_card;
              const isCompany = card?.card_type === "company";
              const displayName = card
                ? isCompany
                  ? card.company_name
                  : `${card.first_name || ""} ${card.last_name || ""}`.trim()
                : null;

              return (
                <Card
                  key={msg.id}
                  className={`transition-colors ${!msg.is_read ? "border-primary/50 bg-primary/5" : ""}`}
                >
                  <CardContent className="p-4">
                    {/* Business Card Display */}
                    {card && (
                      <div className="flex items-start gap-3 p-3 mb-3 bg-muted/50 rounded-lg border border-border/50">
                        <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                          {isCompany ? (
                            <Building2 className="w-5 h-5 text-primary" />
                          ) : (
                            <User className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="font-semibold">{displayName}</p>
                          {card.job_title && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Briefcase className="w-3 h-3" />
                              {card.job_title}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-3 text-sm">
                            {card.phone && (
                              <a
                                href={`tel:${card.phone}`}
                                className="text-primary flex items-center gap-1 hover:underline"
                              >
                                <Phone className="w-3 h-3" />
                                {card.phone}
                              </a>
                            )}
                            {card.email && (
                              <a
                                href={`mailto:${card.email}`}
                                className="text-primary flex items-center gap-1 hover:underline"
                              >
                                <Mail className="w-3 h-3" />
                                {card.email}
                              </a>
                            )}
                            {card.visitor_anr_code && (
                              <span className="text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                ANR: {card.visitor_anr_code}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        {msg.message && (
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                        )}
                        
                        {/* Voice message player */}
                        {msg.voice_message_url && (
                          <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded-lg">
                            <Mic className="w-4 h-4 text-primary flex-shrink-0" />
                            <audio src={msg.voice_message_url} controls className="flex-1 h-8" />
                          </div>
                        )}
                        
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(msg.created_at), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </span>
                          {!card && msg.visitor_phone && (
                            <a
                              href={`tel:${msg.visitor_phone}`}
                              className="text-xs text-primary flex items-center gap-1 hover:underline"
                            >
                              <Phone className="w-3 h-3" />
                              {msg.visitor_phone}
                            </a>
                          )}
                          {!msg.is_read && (
                            <Badge variant="destructive" className="text-xs">
                              Non lu
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!msg.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => handleMarkAsRead(msg.id)}
                            title="Marquer comme lu"
                          >
                            <Check className="w-4 h-4 text-success" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => handleDelete(msg.id)}
                          disabled={deletingId === msg.id}
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
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
