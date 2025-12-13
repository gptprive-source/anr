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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Send, Users, User, MessageSquare, Eye, Trash2, 
  ToggleLeft, ToggleRight, Plus, Search, Mail, Calendar,
  Home, MapPin, X
} from 'lucide-react';
import { useAdminCommunications, CommunicationReply } from '@/hooks/useAdminCommunications';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
  anr_code?: string;
  anr_address?: string;
}

interface ANROption {
  id: string;
  code: string;
  address: string;
  user_ids: string[];
}

type TargetMode = 'all' | 'by_anr' | 'by_name';

export default function Communications() {
  const { communications, loading, sendCommunication, toggleActive, deleteCommunication, fetchReplies } = useAdminCommunications();
  
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetMode, setTargetMode] = useState<TargetMode>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedAnrs, setSelectedAnrs] = useState<string[]>([]);
  const [allowReply, setAllowReply] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [anrs, setAnrs] = useState<ANROption[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [anrSearch, setAnrSearch] = useState('');
  const [sending, setSending] = useState(false);
  
  const [selectedComm, setSelectedComm] = useState<string | null>(null);
  const [replies, setReplies] = useState<CommunicationReply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch users with their ANR info
      const { data: residentsData } = await supabase
        .from('residents')
        .select(`
          user_id,
          habitation:habitations(
            anr:anrs(code, address)
          ),
          profile:profiles(first_name, last_name)
        `)
        .eq('status', 'verified');

      if (residentsData) {
        const userMap = new Map<string, UserOption>();
        residentsData.forEach((r: any) => {
          if (r.user_id && r.profile) {
            userMap.set(r.user_id, {
              id: r.user_id,
              first_name: r.profile.first_name,
              last_name: r.profile.last_name,
              anr_code: r.habitation?.anr?.code,
              anr_address: r.habitation?.anr?.address
            });
          }
        });
        setUsers(Array.from(userMap.values()));
      }

      // Fetch ANRs with their residents
      const { data: anrsData } = await supabase
        .from('anrs')
        .select(`
          id,
          code,
          address,
          habitations(
            residents(user_id)
          )
        `)
        .order('code');

      if (anrsData) {
        const anrOptions: ANROption[] = anrsData.map((anr: any) => {
          const userIds: string[] = [];
          anr.habitations?.forEach((h: any) => {
            h.residents?.forEach((r: any) => {
              if (r.user_id) userIds.push(r.user_id);
            });
          });
          return {
            id: anr.id,
            code: anr.code,
            address: anr.address,
            user_ids: [...new Set(userIds)]
          };
        });
        setAnrs(anrOptions);
      }
    };
    fetchData();
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !content.trim()) return;
    
    setSending(true);
    
    let targetUserIds: string[] = [];
    let targetType: 'all' | 'specific' = 'all';

    if (targetMode === 'all') {
      targetType = 'all';
      // Collect ALL user IDs from all ANRs
      anrs.forEach(anr => {
        targetUserIds.push(...anr.user_ids);
      });
      targetUserIds = [...new Set(targetUserIds)];
    } else if (targetMode === 'by_anr') {
      targetType = 'specific';
      // Get all user IDs from selected ANRs
      selectedAnrs.forEach(anrId => {
        const anr = anrs.find(a => a.id === anrId);
        if (anr) {
          targetUserIds.push(...anr.user_ids);
        }
      });
      targetUserIds = [...new Set(targetUserIds)];
    } else if (targetMode === 'by_name') {
      targetType = 'specific';
      targetUserIds = selectedUsers;
    }

    const success = await sendCommunication(title, content, targetType, targetUserIds, allowReply);
    setSending(false);
    
    if (success) {
      setShowNewDialog(false);
      setTitle('');
      setContent('');
      setTargetMode('all');
      setSelectedUsers([]);
      setSelectedAnrs([]);
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
    (u.last_name?.toLowerCase().includes(userSearch.toLowerCase())) ||
    (u.anr_code?.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredAnrs = anrs.filter(a => 
    !anrSearch || 
    a.code.toLowerCase().includes(anrSearch.toLowerCase()) ||
    a.address.toLowerCase().includes(anrSearch.toLowerCase())
  );

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleAnrSelection = (anrId: string) => {
    setSelectedAnrs(prev => 
      prev.includes(anrId) 
        ? prev.filter(id => id !== anrId)
        : [...prev, anrId]
    );
  };

  const getSelectedCount = () => {
    if (targetMode === 'all') return users.length;
    if (targetMode === 'by_anr') {
      const userIds = new Set<string>();
      selectedAnrs.forEach(anrId => {
        const anr = anrs.find(a => a.id === anrId);
        if (anr) anr.user_ids.forEach(id => userIds.add(id));
      });
      return userIds.size;
    }
    return selectedUsers.length;
  };

  const stats = {
    total: communications.length,
    active: communications.filter(c => c.is_active).length,
    withReplies: communications.filter(c => c.allow_reply).length
  };

  const canSend = title.trim() && content.trim() && (
    targetMode === 'all' ||
    (targetMode === 'by_anr' && selectedAnrs.length > 0) ||
    (targetMode === 'by_name' && selectedUsers.length > 0)
  );

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
                
                <div className="space-y-3">
                  <Label>Destinataires</Label>
                  
                  {/* Target mode selection */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={targetMode === 'all' ? 'default' : 'outline'}
                      className="flex items-center gap-2 h-auto py-3"
                      onClick={() => setTargetMode('all')}
                    >
                      <Users className="h-4 w-4" />
                      <div className="text-left">
                        <div className="text-sm font-medium">Tous</div>
                        <div className="text-xs opacity-70">{users.length} abonnés</div>
                      </div>
                    </Button>
                    <Button
                      type="button"
                      variant={targetMode === 'by_anr' ? 'default' : 'outline'}
                      className="flex items-center gap-2 h-auto py-3"
                      onClick={() => setTargetMode('by_anr')}
                    >
                      <Home className="h-4 w-4" />
                      <div className="text-left">
                        <div className="text-sm font-medium">Par ANR</div>
                        <div className="text-xs opacity-70">{anrs.length} ANRs</div>
                      </div>
                    </Button>
                    <Button
                      type="button"
                      variant={targetMode === 'by_name' ? 'default' : 'outline'}
                      className="flex items-center gap-2 h-auto py-3"
                      onClick={() => setTargetMode('by_name')}
                    >
                      <User className="h-4 w-4" />
                      <div className="text-left">
                        <div className="text-sm font-medium">Par nom</div>
                        <div className="text-xs opacity-70">Sélection</div>
                      </div>
                    </Button>
                  </div>

                  {/* By ANR selection */}
                  {targetMode === 'by_anr' && (
                    <div className="space-y-2 border rounded-lg p-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          value={anrSearch}
                          onChange={(e) => setAnrSearch(e.target.value)}
                          placeholder="Rechercher par code ANR ou adresse..."
                          className="pl-9"
                        />
                      </div>
                      
                      {selectedAnrs.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {selectedAnrs.map(anrId => {
                            const anr = anrs.find(a => a.id === anrId);
                            return anr ? (
                              <Badge key={anrId} variant="secondary" className="gap-1">
                                {anr.code}
                                <X 
                                  className="h-3 w-3 cursor-pointer" 
                                  onClick={() => toggleAnrSelection(anrId)}
                                />
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                      
                      <ScrollArea className="h-48 border rounded-md">
                        {filteredAnrs.map(anr => (
                          <div 
                            key={anr.id}
                            onClick={() => toggleAnrSelection(anr.id)}
                            className={`p-3 cursor-pointer border-b last:border-0 flex items-start gap-3 ${
                              selectedAnrs.includes(anr.id) 
                                ? 'bg-primary/10' 
                                : 'hover:bg-muted'
                            }`}
                          >
                            <Checkbox 
                              checked={selectedAnrs.includes(anr.id)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold text-primary">{anr.code}</span>
                                <Badge variant="outline" className="text-xs">
                                  {anr.user_ids.length} résident(s)
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3" />
                                {anr.address}
                              </p>
                            </div>
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                  )}

                  {/* By name selection */}
                  {targetMode === 'by_name' && (
                    <div className="space-y-2 border rounded-lg p-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          placeholder="Rechercher par nom, prénom ou code ANR..."
                          className="pl-9"
                        />
                      </div>
                      
                      {selectedUsers.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {selectedUsers.map(userId => {
                            const user = users.find(u => u.id === userId);
                            return user ? (
                              <Badge key={userId} variant="secondary" className="gap-1">
                                {user.first_name} {user.last_name}
                                <X 
                                  className="h-3 w-3 cursor-pointer" 
                                  onClick={() => toggleUserSelection(userId)}
                                />
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                      
                      <ScrollArea className="h-48 border rounded-md">
                        {filteredUsers.map(user => (
                          <div 
                            key={user.id}
                            onClick={() => toggleUserSelection(user.id)}
                            className={`p-3 cursor-pointer border-b last:border-0 flex items-start gap-3 ${
                              selectedUsers.includes(user.id) 
                                ? 'bg-primary/10' 
                                : 'hover:bg-muted'
                            }`}
                          >
                            <Checkbox 
                              checked={selectedUsers.includes(user.id)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {user.first_name} {user.last_name}
                                </span>
                                {user.anr_code && (
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {user.anr_code}
                                  </Badge>
                                )}
                              </div>
                              {user.anr_address && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {user.anr_address}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">
                    {getSelectedCount()} destinataire(s) sélectionné(s)
                  </p>
                </div>
                
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
                  disabled={!canSend || sending}
                  className="w-full gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sending ? 'Envoi en cours...' : `Envoyer à ${getSelectedCount()} destinataire(s)`}
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
