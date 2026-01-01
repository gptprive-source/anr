import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Search, Filter, ChevronRight, Plus, Home, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useMessages, Conversation } from "@/hooks/useMessages";
import { formatDistanceToNow, isToday, isThisWeek, isThisMonth } from "date-fns";
import { fr } from "date-fns/locale";
import BottomNav from "@/components/layout/BottomNav";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import NewMessageToAnrDialog from "@/components/messages/NewMessageToAnrDialog";
import { toast } from "sonner";

type StatusFilter = "all" | "unread" | "read";
type DateFilter = "all" | "today" | "week" | "month";

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    conversations,
    unreadCount,
    loading,
    deleteConversation,
    refetch,
  } = useMessages();

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      if (statusFilter === "unread" && conv.unreadCount === 0) return false;
      if (statusFilter === "read" && conv.unreadCount > 0) return false;
      if (dateFilter === "today" && !isToday(conv.lastMessageDate)) return false;
      if (dateFilter === "week" && !isThisWeek(conv.lastMessageDate, { weekStartsOn: 1 })) return false;
      if (dateFilter === "month" && !isThisMonth(conv.lastMessageDate)) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = conv.recipientName.toLowerCase().includes(query);
        const matchesHabitation = conv.habitationName?.toLowerCase().includes(query);
        const matchesMessage = conv.lastMessage?.toLowerCase().includes(query);
        if (!matchesName && !matchesHabitation && !matchesMessage) {
          return false;
        }
      }
      return true;
    });
  }, [conversations, statusFilter, dateFilter, searchQuery]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground">Connectez-vous pour voir vos messages</p>
          <Button className="mt-4" onClick={() => navigate("/login")}>
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Empty state
  if (conversations.length === 0) {
    return (
      <div className="min-h-screen pb-20">
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          <div className="flex items-center gap-4 pt-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Mes messages
              </h1>
            </div>
          </div>

          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium">Aucun message</p>
              <p className="text-muted-foreground mt-1">
                Vos conversations apparaîtront ici
              </p>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const handleNavigate = (conv: Conversation) => {
    navigate(`/chat/${conv.id}`);
  };

  const handleDelete = async () => {
    if (!deleteConfirm || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteConversation(deleteConfirm.id);
      // Refresh the messages list to ensure UI is updated
      await refetch();
      toast.success("Conversation supprimée");
    } catch (err) {
      console.error("Error deleting conversation:", err);
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
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
              <p className="text-primary-foreground/70 text-xs">
                {conversations.length} conversation{conversations.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-sm">
                {unreadCount} non lu{unreadCount > 1 ? "s" : ""}
              </Badge>
            )}
            
            <Button
              size="sm"
              className="bg-white text-primary hover:bg-white/90 font-semibold gap-1.5 shadow-sm"
              onClick={() => setShowNewMessage(true)}
            >
              <Plus className="w-4 h-4" />
              Nouveau
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/50" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 flex gap-2 overflow-x-auto">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[140px] shrink-0">
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
          <SelectTrigger className="w-[140px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les dates</SelectItem>
            <SelectItem value="today">Aujourd'hui</SelectItem>
            <SelectItem value="week">Cette semaine</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Conversations list */}
      <div className="px-4 space-y-2">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun résultat pour cette recherche
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <Card 
              key={conv.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                conv.unreadCount > 0 ? "border-primary/50 bg-primary/5" : ""
              }`}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <Avatar className="h-12 w-12 shrink-0">
                    {conv.recipientAvatarUrl ? (
                      <AvatarImage src={conv.recipientAvatarUrl} alt={conv.recipientName} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {conv.recipientName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div 
                    className="flex-1 min-w-0"
                    onClick={() => handleNavigate(conv)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-medium truncate ${conv.unreadCount > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                        {conv.recipientName}
                      </p>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(conv.lastMessageDate, { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                    
                    {/* Habitation context */}
                    {conv.habitationName && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Home className="w-3 h-3" />
                        <span className="truncate">{conv.habitationName}</span>
                      </div>
                    )}
                    
                    <p className={`text-sm truncate mt-1 ${conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {conv.lastMessage || "..."}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {conv.unreadCount > 0 && (
                      <Badge variant="default" className="h-5 min-w-[20px] justify-center px-1.5">
                        {conv.unreadCount}
                      </Badge>
                    )}
                    

                    <ChevronRight 
                      className="w-5 h-5 text-muted-foreground" 
                      onClick={() => handleNavigate(conv)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la conversation ?</AlertDialogTitle>
            <AlertDialogDescription>
              La conversation avec {deleteConfirm?.name} sera supprimée de votre liste.
              L'autre participant gardera sa copie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                "Supprimer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New message dialog */}
      <NewMessageToAnrDialog open={showNewMessage} onOpenChange={setShowNewMessage} />

      {/* Floating Action Button for mobile */}
      <Button
        size="lg"
        className="fixed bottom-24 right-4 z-20 rounded-full w-14 h-14 shadow-lg"
        onClick={() => setShowNewMessage(true)}
      >
        <Plus className="w-6 h-6" />
      </Button>

      <BottomNav />
    </div>
  );
};

export default Messages;
