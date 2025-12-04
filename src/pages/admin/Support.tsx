import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageCircle, User, Bot, Send, Check, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Support = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['admin_support_conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get user profiles
      const userIds = [...new Set(data?.map(c => c.user_id).filter(Boolean) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, any>);

      return (data || []).map(conv => ({
        ...conv,
        user: profileMap[conv.user_id!],
      }));
    },
  });

  const { data: messages } = useQuery({
    queryKey: ['support_messages', selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return [];
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('conversation_id', selectedConversation)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedConversation,
  });

  const sendReplyMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConversation || !user) throw new Error("No conversation selected");

      const { error } = await supabase.from('support_messages').insert({
        conversation_id: selectedConversation,
        sender_type: 'agent',
        sender_id: user.id,
        content,
      });

      if (error) throw error;

      // Update conversation status
      await supabase
        .from('support_conversations')
        .update({ status: 'open', assigned_to: user.id })
        .eq('id', selectedConversation);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support_messages', selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ['admin_support_conversations'] });
      setReplyContent("");
      toast.success("Réponse envoyée");
    },
    onError: () => toast.error("Erreur lors de l'envoi"),
  });

  const closeConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('support_conversations')
        .update({ status: 'closed' })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_support_conversations'] });
      toast.success("Conversation fermée");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-green-500">Ouvert</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">En attente</Badge>;
      case 'closed':
        return <Badge variant="secondary">Fermé</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Support</h1>
          <p className="text-muted-foreground">Gérez les demandes de support utilisateur</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <Card className="md:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Conversations ({conversations?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-320px)]">
                {conversations?.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`w-full p-4 text-left border-b border-border hover:bg-muted/50 transition-colors ${
                      selectedConversation === conv.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">
                        {conv.user?.first_name} {conv.user?.last_name}
                      </span>
                      {getStatusBadge(conv.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(conv.updated_at), 'dd MMM HH:mm', { locale: fr })}
                    </p>
                  </button>
                ))}
                {conversations?.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Aucune conversation
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card className="md:col-span-2 flex flex-col">
            {selectedConversation ? (
              <>
                <CardHeader className="pb-3 border-b flex-row items-center justify-between">
                  <CardTitle className="text-lg">Messages</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => closeConversationMutation.mutate(selectedConversation)}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Fermer
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages?.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex gap-3 ${msg.sender_type === 'agent' ? 'flex-row-reverse' : ''}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            msg.sender_type === 'user' 
                              ? 'bg-primary/20' 
                              : msg.sender_type === 'bot'
                                ? 'bg-muted'
                                : 'bg-green-500/20'
                          }`}>
                            {msg.sender_type === 'user' ? (
                              <User className="w-4 h-4" />
                            ) : msg.sender_type === 'bot' ? (
                              <Bot className="w-4 h-4" />
                            ) : (
                              <User className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                          <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            msg.sender_type === 'agent'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}>
                            <p className="text-sm">{msg.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {format(new Date(msg.created_at), 'HH:mm', { locale: fr })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Reply Input */}
                  <div className="p-4 border-t">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (replyContent.trim()) {
                          sendReplyMutation.mutate(replyContent);
                        }
                      }}
                      className="flex gap-2"
                    >
                      <Textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Votre réponse..."
                        rows={2}
                        className="flex-1 resize-none"
                      />
                      <Button 
                        type="submit" 
                        disabled={!replyContent.trim() || sendReplyMutation.isPending}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Sélectionnez une conversation</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Support;
