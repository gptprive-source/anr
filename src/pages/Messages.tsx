import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Search, Filter, User, Building2, Inbox, MailOpen, Mail as MailClosed, ChevronRight, Ban, Home, Send, Trash2, Plus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useVisitorMessages } from "@/hooks/useVisitorMessages";
import { useSentMessages } from "@/hooks/useSentMessages";
import { useBlockedVisitors } from "@/hooks/useBlockedVisitors";
import { useUserPlan } from "@/hooks/useUserPlan";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, isToday, isThisWeek, isThisMonth } from "date-fns";
import { fr } from "date-fns/locale";
import BottomNav from "@/components/layout/BottomNav";
import { Loader2 } from "lucide-react";

import NewMessageToAnrDialog from "@/components/messages/NewMessageToAnrDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type StatusFilter = "all" | "unread" | "read";
type DateFilter = "all" | "today" | "week" | "month";

// Unified conversation type for merged list
interface UnifiedConversation {
  id: string;
  type: 'received' | 'sent';
  displayName: string;
  subtitle: string | null;
  lastMessage: string | null;
  lastMessageDate: Date;
  unreadCount: number;
  totalMessages: number;
  hasReply: boolean;
  avatarUrl: string | null;
  isCompany: boolean;
}

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { limits } = useUserPlan();
  const [habitationId, setHabitationId] = useState<string | null>(null);
  const [isResident, setIsResident] = useState<boolean | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; type: 'received' | 'sent' } | null>(null);
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  
  // Check if user can send new messages (has active subscription)
  const canSendNewMessages = limits.hasActiveSubscription;

  // Determine if user is resident or connected visitor
  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setLoadingRole(false);
        return;
      }

      // Check if user is a verified resident
      const { data: residentData } = await supabase
        .from("residents")
        .select("habitation_id")
        .eq("user_id", user.id)
        .eq("status", "verified")
        .maybeSingle();
      
      if (residentData?.habitation_id) {
        setHabitationId(residentData.habitation_id);
        setIsResident(true);
      } else {
        setIsResident(false);
      }
      setLoadingRole(false);
    };
    checkUserRole();
  }, [user]);

  // Hooks for resident (received messages)
  const {
    messages,
    unreadCount,
    loading: loadingReceived,
    deleteConversation: deleteReceivedConversation
  } = useVisitorMessages(habitationId || "");
  
  const { isBlocked, blockedVisitors, unblockVisitor } = useBlockedVisitors();
  const [showBlocked, setShowBlocked] = useState(false);

  // Hooks for visitor (sent messages)
  const {
    conversations: sentConversations,
    unreadRepliesCount,
    loading: loadingSent,
    businessCard,
    deleteConversation
  } = useSentMessages();

  // Group messages by visitor AND recipient (for residents) - internal processing
  // This creates separate conversations for:
  // 1. Messages to the whole residence (recipient_user_id = null)
  // 2. Private messages to each specific resident
  const groupedReceivedConversations = useMemo(() => {
    if (!isResident) return [];
    const groups = new Map<string, {
      visitorId: string;
      conversationKey: string; // Unique key: visitorId + recipient type
      displayName: string;
      isCompany: boolean;
      isPrivate: boolean; // true if this is a private conversation
      jobTitle: string | null;
      lastMessage: string | null;
      lastMessageDate: Date;
      unreadCount: number;
      totalMessages: number;
      hasReply: boolean;
      avatarUrl: string | null;
    }>();
    
    messages.forEach(msg => {
      // Use business_card_id as primary key for connected users (stable identifier)
      // Fall back to visitor_device_id for anonymous visitors, then visitor_phone
      const baseVisitorId = msg.business_card_id || msg.visitor_device_id || msg.visitor_phone || `anon-${msg.id}`;
      
      // Create separate conversation keys for residence vs private messages
      // Format: visitorId__residence OR visitorId__private
      const isPrivateMessage = !!(msg as any).recipient_user_id;
      const conversationKey = isPrivateMessage 
        ? `${baseVisitorId}__private` 
        : `${baseVisitorId}__residence`;
      
      const existing = groups.get(conversationKey);
      const card = msg.business_card;
      const isCompany = card?.card_type === "company";
      const baseName = card 
        ? isCompany 
          ? card.company_name || "Entreprise" 
          : `${card.first_name || ""} ${card.last_name || ""}`.trim() || "Visiteur" 
        : msg.visitor_phone || "Visiteur";
      
      // Add suffix to distinguish private vs residence conversations
      const displayName = isPrivateMessage 
        ? `${baseName} (privé)` 
        : baseName;
      
      if (existing) {
        if (new Date(msg.created_at) > existing.lastMessageDate) {
          existing.lastMessage = msg.message || (msg.voice_message_url ? "🎤 Message vocal" : msg.media_url ? (msg.media_type?.startsWith('video') ? "🎥 Vidéo" : "📷 Photo") : null);
          existing.lastMessageDate = new Date(msg.created_at);
          existing.hasReply = msg.has_reply || existing.hasReply;
        }
        if (!msg.is_read) {
          existing.unreadCount++;
        }
        existing.totalMessages++;
        if (card && !existing.avatarUrl) {
          existing.displayName = displayName;
          existing.isCompany = isCompany;
          existing.jobTitle = card.job_title;
          existing.avatarUrl = card.avatar_url;
        }
      } else {
        groups.set(conversationKey, {
          visitorId: baseVisitorId,
          conversationKey,
          displayName,
          isCompany,
          isPrivate: isPrivateMessage,
          jobTitle: card?.job_title || null,
          lastMessage: msg.message || (msg.voice_message_url ? "🎤 Message vocal" : msg.media_url ? (msg.media_type?.startsWith('video') ? "🎥 Vidéo" : "📷 Photo") : null),
          lastMessageDate: new Date(msg.created_at),
          unreadCount: msg.is_read ? 0 : 1,
          totalMessages: 1,
          hasReply: msg.has_reply || false,
          avatarUrl: card?.avatar_url || null
        });
      }
    });
    return Array.from(groups.values());
  }, [messages, isResident]);

  // Create unified conversation list (merge received + sent)
  const unifiedConversations = useMemo(() => {
    const unified: UnifiedConversation[] = [];
    
    // Add received conversations (from residents)
    groupedReceivedConversations.forEach(conv => {
      if (!isBlocked(conv.visitorId)) {
        unified.push({
          id: conv.conversationKey, // Use conversationKey for unique identification
          type: 'received',
          displayName: conv.displayName,
          subtitle: conv.isPrivate ? "Message privé" : conv.jobTitle,
          lastMessage: conv.lastMessage,
          lastMessageDate: conv.lastMessageDate,
          unreadCount: conv.unreadCount,
          totalMessages: conv.totalMessages,
          hasReply: conv.hasReply,
          avatarUrl: conv.avatarUrl,
          isCompany: conv.isCompany
        });
      }
    });
    
    // Add sent conversations (to ANRs) - use resident name instead of habitation name
    sentConversations.forEach(conv => {
      unified.push({
        id: conv.habitationId,
        type: 'sent',
        displayName: conv.residentName || conv.habitationName,
        subtitle: conv.anrAddress,
        lastMessage: conv.lastMessage,
        lastMessageDate: conv.lastMessageDate,
        unreadCount: conv.unreadRepliesCount,
        totalMessages: conv.totalMessages,
        hasReply: conv.hasReplies,
        avatarUrl: null,
        isCompany: false
      });
    });
    
    // Sort by last message date (newest first)
    return unified.sort((a, b) => b.lastMessageDate.getTime() - a.lastMessageDate.getTime());
  }, [groupedReceivedConversations, sentConversations, isBlocked]);

  // Filter unified conversations
  const filteredConversations = useMemo(() => {
    return unifiedConversations.filter(conv => {
      if (statusFilter === "unread" && conv.unreadCount === 0) return false;
      if (statusFilter === "read" && conv.unreadCount > 0) return false;
      if (dateFilter === "today" && !isToday(conv.lastMessageDate)) return false;
      if (dateFilter === "week" && !isThisWeek(conv.lastMessageDate, { weekStartsOn: 1 })) return false;
      if (dateFilter === "month" && !isThisMonth(conv.lastMessageDate)) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = conv.displayName.toLowerCase().includes(query);
        const matchesSubtitle = conv.subtitle?.toLowerCase().includes(query);
        const matchesMessage = conv.lastMessage?.toLowerCase().includes(query);
        if (!matchesName && !matchesSubtitle && !matchesMessage) {
          return false;
        }
      }
      return true;
    });
  }, [unifiedConversations, statusFilter, dateFilter, searchQuery]);

  const loading = loadingRole || loadingReceived || loadingSent;
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Connected visitor without messages AND not a resident - empty state
  if (isResident === false && sentConversations.length === 0) {
    return (
      <div className="min-h-screen pb-20">
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          <div className="flex items-center gap-4 pt-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-500" />
                Mes messages
              </h1>
            </div>
          </div>

          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Send className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium">Aucun message</p>
              <p className="text-muted-foreground mt-1">
                Scannez un ANR et envoyez un message à un résident
              </p>
            </div>
            <Button onClick={() => navigate("/visitor")} className="mt-4">
              Scanner un ANR
            </Button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Resident without habitation
  if (isResident && !habitationId) {
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

  // Calculate stats - combined
  const totalConversations = unifiedConversations.length;
  const totalUnread = unreadCount + unreadRepliesCount;
  const totalMessages = messages.length + sentConversations.reduce((acc, c) => acc + c.totalMessages, 0);

  const handleNavigate = (conv: UnifiedConversation) => {
    // All conversations now use the unified /conversation/:id route
    navigate(`/conversation/${conv.id}`);
  };

  const handleDelete = (conv: UnifiedConversation) => {
    setDeleteConfirm({ id: conv.id, name: conv.displayName, type: conv.type });
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/dashboard")} 
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Messagerie</h1>
              {businessCard && (
                <p className="text-primary-foreground/70 text-xs">
                  {businessCard.first_name} {businessCard.last_name}
                </p>
              )}
            </div>
          </div>
          
          {/* New message button */}
          {canSendNewMessages ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => setShowNewMessageDialog(true)}
                    className="gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-xs">Nouveau</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Envoyer un message à une autre ANR</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1 opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <Lock className="w-4 h-4" />
                    <span className="text-xs">Nouveau</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Abonnement requis pour envoyer des messages</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-neumorphic-inset">
                <Inbox className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalConversations}</p>
            <span className="text-xs text-muted-foreground">Conversations</span>
          </Card>
          <Card className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shadow-neumorphic-inset">
                <MailClosed className="w-5 h-5 text-destructive" />
              </div>
            </div>
            <p className="text-2xl font-bold text-destructive">{totalUnread}</p>
            <span className="text-xs text-muted-foreground">Non lus</span>
          </Card>
          <Card className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shadow-neumorphic-inset">
                <MailOpen className="w-5 h-5 text-success" />
              </div>
            </div>
            <p className="text-2xl font-bold text-success">{totalMessages}</p>
            <span className="text-xs text-muted-foreground">Total msgs</span>
          </Card>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="pl-10" 
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
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

            <Select value={dateFilter} onValueChange={v => setDateFilter(v as DateFilter)}>
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

            {isResident && blockedVisitors.length > 0 && (
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
        {isResident && showBlocked && blockedVisitors.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Ban className="w-4 h-4" />
              Visiteurs bloqués
            </h3>
            {blockedVisitors.map(blocked => (
              <Card key={blocked.id} className="bg-destructive/5">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                      <Ban className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {blocked.visitor_name || "Visiteur anonyme"}
                      </p>
                      {blocked.reason && <p className="text-xs text-muted-foreground">{blocked.reason}</p>}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => unblockVisitor(blocked.visitor_identifier)}>
                    Débloquer
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Unified Conversations list */}
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {unifiedConversations.length === 0 ? "Aucune conversation" : "Aucun résultat"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredConversations.map(conv => {
              const preview = conv.lastMessage 
                ? conv.lastMessage.substring(0, 50) + (conv.lastMessage.length > 50 ? "..." : "") 
                : "";
              
              return (
                <Card 
                  key={`${conv.type}-${conv.id}`} 
                  className={`cursor-pointer transition-all hover:scale-[1.02] ${conv.unreadCount > 0 ? "ring-2 ring-primary/30" : ""}`} 
                  onClick={() => handleNavigate(conv)}
                >
                  <CardContent className={`p-4 border-2 border-solid rounded-xl ${conv.type === 'received' ? "border-[#08aa13]" : "border-primary"}`}>
                    <div className="flex items-center gap-3">
                      {/* Avatar with type indicator */}
                      <div className="relative">
                        <Avatar className="h-11 w-11 flex-shrink-0">
                          {conv.avatarUrl ? <AvatarImage src={conv.avatarUrl} alt={conv.displayName} /> : null}
                          <AvatarFallback className={
                            conv.type === 'sent' 
                              ? "bg-blue-500/10" 
                              : conv.isCompany 
                                ? "bg-orange-500/10" 
                                : "bg-purple-500/10"
                          }>
                            {conv.type === 'sent' ? (
                              <Home className="w-5 h-5 text-blue-500" />
                            ) : conv.isCompany ? (
                              <Building2 className="w-5 h-5 text-orange-500" />
                            ) : (
                              <User className="w-5 h-5 text-purple-500" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        {/* Type badge */}
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                          conv.type === 'received' ? "bg-green-500" : "bg-primary"
                        }`}>
                          {conv.type === 'received' ? (
                            <Inbox className="w-3 h-3 text-white" />
                          ) : (
                            <Send className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate text-foreground">
                            {conv.displayName}
                          </p>
                          <span className="text-xs text-foreground/70 flex-shrink-0">
                            {formatDistanceToNow(conv.lastMessageDate, { addSuffix: false, locale: fr })}
                          </span>
                        </div>
                        
                        {conv.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">{conv.subtitle}</p>
                        )}
                        
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm truncate text-foreground/80">
                            {conv.hasReply && <span className={conv.type === 'received' ? "text-primary mr-1" : "text-green-500 mr-1"}>↩</span>}
                            {preview}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          {conv.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs h-5">
                              {conv.unreadCount} {conv.type === 'received' ? `nouveau${conv.unreadCount > 1 ? "x" : ""}` : `réponse${conv.unreadCount > 1 ? "s" : ""}`}
                            </Badge>
                          )}
                          {conv.totalMessages > 1 && (
                            <Badge variant="secondary" className="text-xs h-5">
                              {conv.totalMessages} messages
                            </Badge>
                          )}
                          {conv.hasReply && (
                            <Badge variant="outline" className="text-xs h-5 text-green-600 border-green-600">
                              {conv.type === 'received' ? "Répondu" : "Réponse reçue"}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:bg-destructive/10 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(conv);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la conversation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer définitivement tous les messages de la conversation avec <strong>{deleteConfirm?.name}</strong>. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirm) {
                  if (deleteConfirm.type === 'received') {
                    deleteReceivedConversation(deleteConfirm.id);
                  } else {
                    deleteConversation(deleteConfirm.id);
                  }
                  setDeleteConfirm(null);
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New message to ANR dialog */}
      <NewMessageToAnrDialog 
        open={showNewMessageDialog} 
        onOpenChange={setShowNewMessageDialog} 
      />

      <BottomNav />
    </div>
  );
};

export default Messages;
