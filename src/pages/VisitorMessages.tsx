import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, MessageSquare, Home, UserPlus, Lock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useVisitorDeviceMessages, VisitorDeviceConversation } from "@/hooks/useVisitorDeviceMessages";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import VisitorFooter from "@/components/layout/VisitorFooter";

const VisitorMessages = () => {
  const navigate = useNavigate();
  const { conversations, unreadCount, loading } = useVisitorDeviceMessages();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return format(date, "HH:mm", { locale: fr });
    } else if (diffDays === 1) {
      return "Hier";
    } else if (diffDays < 7) {
      return format(date, "EEEE", { locale: fr });
    } else {
      return format(date, "dd/MM/yyyy", { locale: fr });
    }
  };

  const getLastMessagePreview = (conv: VisitorDeviceConversation): string => {
    // Get all messages and replies in chronological order
    const allItems: { text: string; date: string; isReply: boolean }[] = [];
    
    for (const msg of conv.messages) {
      if (msg.message || msg.voice_message_url) {
        allItems.push({
          text: msg.voice_message_url ? "🎤 Message vocal envoyé" : (msg.message || "Message chiffré"),
          date: msg.created_at,
          isReply: false
        });
      }
      for (const reply of msg.replies) {
        allItems.push({
          text: reply.reply_voice_url ? "🎤 Message vocal" : (reply.reply_text || "Message chiffré"),
          date: reply.created_at,
          isReply: true
        });
      }
    }
    
    allItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return allItems[0]?.text || "Conversation";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted pb-20">
        <header className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Mes conversations</h1>
          </div>
        </header>
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Mes conversations</h1>
          </div>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="bg-white text-primary">
              {unreadCount} non lu{unreadCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </header>

      {/* Info Banner */}
      <div className="mx-4 mt-4 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Conversations stockées sur cet appareil
            </p>
            <p className="text-xs text-muted-foreground">
              Créez un compte pour retrouver vos conversations sur tous vos appareils et contacter n'importe quel abonné ANR.
            </p>
            <Link 
              to="/register" 
              className="inline-flex items-center text-xs text-primary font-medium hover:underline mt-1"
            >
              Créer un compte <ChevronRight className="h-3 w-3 ml-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="p-4 space-y-3">
        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted-foreground/10 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">Aucune conversation</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Scannez un QR code ANR pour contacter un résident
            </p>
            <Button 
              variant="outline" 
              onClick={() => navigate("/visitor")}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Scanner un ANR
            </Button>
          </div>
        ) : (
          conversations.map((conv) => {
            const hasUnread = conv.unread_count > 0;
            const hasEncryption = conv.messages.some(m => 
              m.is_encrypted || m.replies.some(r => r.is_encrypted)
            );

            return (
              <Card 
                key={conv.conversation_key}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  hasUnread ? "border-primary border-2" : "border-border"
                )}
                onClick={() => navigate(`/visitor-conversation/${conv.conversation_key}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                      hasUnread ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <Home className="h-6 w-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className={cn(
                          "font-medium truncate",
                          hasUnread && "font-semibold"
                        )}>
                          {conv.habitation_name}
                        </h3>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatDate(conv.last_activity)}
                        </span>
                      </div>
                      
                      {conv.anr_code && (
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.anr_code}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-1">
                        <p className={cn(
                          "text-sm truncate max-w-[80%]",
                          hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                          {getLastMessagePreview(conv)}
                        </p>
                        {hasUnread && (
                          <Badge variant="default" className="ml-2 bg-primary">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>

                      {/* Encryption indicator */}
                      {hasEncryption && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                          <Lock className="h-3 w-3" />
                          <span>Chiffré de bout en bout</span>
                        </div>
                      )}
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* CTA pour créer un compte */}
      {conversations.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-40">
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">Créez un compte ANR</p>
                  <p className="text-xs opacity-90">
                    Accès multi-appareils • Contacter n'importe qui
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => navigate("/register")}
                  className="flex-shrink-0"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  S'inscrire
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <VisitorFooter />
    </div>
  );
};

export default VisitorMessages;
