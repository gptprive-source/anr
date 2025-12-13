import { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Send, Users, User, MessageSquare, Eye, Trash2, 
  ToggleLeft, ToggleRight, Plus, Search, Mail, Calendar
} from 'lucide-react';
import { useAdminCommunications, CommunicationReply } from '@/hooks/useAdminCommunications';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserOption {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export default function Communications() {
  const { communications, loading, sendCommunication, toggleActive, deleteCommunication, fetchReplies } = useAdminCommunications();
  
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'specific'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [allowReply, setAllowReply] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [sending, setSending] = useState(false);
  
  const [selectedComm, setSelectedComm] = useState<string | null>(null);
  const [replies, setReplies] = useState<CommunicationReply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .limit(100);
      
      if (data) {
        // Get emails from auth via admin (simplified - just use profiles)
        setUsers(data.map(p => ({
          id: p.id,
          email: '',
          first_name: p.first_name,
          last_name: p.last_name
        })));
      }
    };
    fetchUsers();
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !content.trim()) return;
    
    setSending(true);
    const success = await sendCommunication(title, content, targetType, selectedUsers, allowReply);
    setSending(false);
    
    if (success) {
      setShowNewDialog(false);
      setTitle('');
      setContent('');
      setTargetType('all');
      setSelectedUsers([]);
      setAllowReply(false);
    }
  };

  const loadReplies = async (commId: string) => {
    setSelectedComm(commId);
    setLoadingReplies(true);
    const data = await fetchReplies(commId);
    setReplies(data);
    setLoadingReplies(false);
  };

  const filteredUsers = users.filter(u => 
    !userSearch || 
    (u.first_name?.toLowerCase().includes(userSearch.toLowerCase())) ||
    (u.last_name?.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const stats = {
    total: communications.length,
    active: communications.filter(c => c.is_active).length,
    withReplies: communications.filter(c => c.allow_reply).length
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Communications</h1>
            <p className="text-muted-foreground">Envoyez des messages aux utilisateurs</p>
          </div>
          
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nouvelle communication
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nouvelle communication</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Titre</Label>
                  <Input 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Titre de la communication"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Contenu du message (les liens https:// seront cliquables)"
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Les URLs (https://...) seront automatiquement converties en liens cliquables
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Destinataires</Label>
                  <Select value={targetType} onValueChange={(v) => setTargetType(v as 'all' | 'specific')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Tous les utilisateurs
                        </div>
                      </SelectItem>
                      <SelectItem value="specific">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Utilisateurs spécifiques
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {targetType === 'specific' && (
                  <div className="space-y-2">
                    <Label>Sélectionner les utilisateurs</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Rechercher..."
                        className="pl-9"
                      />
                    </div>
                    <ScrollArea className="h-40 border rounded-md p-2">
                      {filteredUsers.map(user => (
                        <div 
                          key={user.id}
                          onClick={() => toggleUserSelection(user.id)}
                          className={`p-2 rounded cursor-pointer flex items-center gap-2 ${
                            selectedUsers.includes(user.id) 
                              ? 'bg-primary/10 text-primary' 
                              : 'hover:bg-muted'
                          }`}
                        >
                          <User className="h-4 w-4" />
                          <span>{user.first_name} {user.last_name}</span>
                        </div>
                      ))}
                    </ScrollArea>
                    {selectedUsers.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {selectedUsers.length} utilisateur(s) sélectionné(s)
                      </p>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <Label>Autoriser les réponses</Label>
                    <p className="text-xs text-muted-foreground">
                      Les utilisateurs pourront répondre à ce message
                    </p>
                  </div>
                  <Switch 
                    checked={allowReply}
                    onCheckedChange={setAllowReply}
                  />
                </div>
                
                <Button 
                  onClick={handleSend}
                  disabled={!title.trim() || !content.trim() || sending || (targetType === 'specific' && selectedUsers.length === 0)}
                  className="w-full gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sending ? 'Envoi en cours...' : 'Envoyer la communication'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total envoyées</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <ToggleRight className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-sm text-muted-foreground">Actives</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500/10">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.withReplies}</p>
                  <p className="text-sm text-muted-foreground">Avec réponses</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Communications list */}
        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list">Liste</TabsTrigger>
            <TabsTrigger value="replies">Réponses</TabsTrigger>
          </TabsList>
          
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>Communications envoyées</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center py-8 text-muted-foreground">Chargement...</p>
                ) : communications.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    Aucune communication envoyée
                  </p>
                ) : (
                  <div className="space-y-4">
                    {communications.map(comm => (
                      <div 
                        key={comm.id}
                        className="p-4 border rounded-lg space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{comm.title}</h3>
                              {comm.is_active ? (
                                <Badge variant="default" className="bg-green-500">Active</Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                              {comm.allow_reply && (
                                <Badge variant="outline">Réponses autorisées</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                              {comm.content}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleActive(comm.id, !comm.is_active)}
                            >
                              {comm.is_active ? (
                                <ToggleRight className="h-4 w-4 text-green-500" />
                              ) : (
                                <ToggleLeft className="h-4 w-4" />
                              )}
                            </Button>
                            {comm.allow_reply && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => loadReplies(comm.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteCommunication(comm.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(comm.sent_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                          </span>
                          <span className="flex items-center gap-1">
                            {comm.target_type === 'all' ? (
                              <>
                                <Users className="h-3 w-3" />
                                Tous les utilisateurs
                              </>
                            ) : (
                              <>
                                <User className="h-3 w-3" />
                                {comm.target_user_ids.length} utilisateur(s)
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="replies">
            <Card>
              <CardHeader>
                <CardTitle>Réponses reçues</CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedComm ? (
                  <p className="text-center py-8 text-muted-foreground">
                    Sélectionnez une communication pour voir les réponses
                  </p>
                ) : loadingReplies ? (
                  <p className="text-center py-8 text-muted-foreground">Chargement...</p>
                ) : replies.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    Aucune réponse pour cette communication
                  </p>
                ) : (
                  <div className="space-y-4">
                    {replies.map(reply => (
                      <div key={reply.id} className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {reply.user_name || 'Utilisateur'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(reply.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                          </span>
                        </div>
                        <p className="text-sm">{reply.reply_text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
