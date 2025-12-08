import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DoorOpen,
  Plus,
  RefreshCw,
  Wifi,
  WifiOff,
  Settings,
  Key,
  Trash2,
  Copy,
  Loader2,
  MapPin,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DoorModule {
  id: string;
  anr_id: string;
  device_id: string;
  secret_key: string;
  is_active: boolean;
  firmware_version: string | null;
  module_type: string | null;
  last_sync_at: string | null;
  relay_duration_ms: number | null;
  rssi_threshold: number | null;
  created_at: string | null;
  anr?: {
    code: string;
    address: string;
  };
}

interface ModuleStats {
  total_modules: number;
  active_modules: number;
  offline_modules: number;
  accesses_today: number;
}

const DoorModulesPage = () => {
  const [modules, setModules] = useState<DoorModule[]>([]);
  const [stats, setStats] = useState<ModuleStats>({
    total_modules: 0,
    active_modules: 0,
    offline_modules: 0,
    accesses_today: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedModule, setSelectedModule] = useState<DoorModule | null>(null);
  const [newModule, setNewModule] = useState({
    anr_id: '',
    device_id: '',
    module_type: 'entry',
  });
  const { toast } = useToast();

  const fetchModules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('door_modules')
        .select(`
          *,
          anr:anrs(code, address)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Type assertion to handle the joined data
      const modulesWithAnr = (data || []).map(module => ({
        ...module,
        anr: Array.isArray(module.anr) ? module.anr[0] : module.anr
      }));

      setModules(modulesWithAnr);

      // Calculate stats
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

      const active = modulesWithAnr.filter(m => 
        m.is_active && m.last_sync_at && new Date(m.last_sync_at) > thirtyMinutesAgo
      ).length;

      // Fetch today's access count
      const { count: accessCount } = await supabase
        .from('door_access_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())
        .eq('result', 'success');

      setStats({
        total_modules: modulesWithAnr.length,
        active_modules: active,
        offline_modules: modulesWithAnr.filter(m => m.is_active).length - active,
        accesses_today: accessCount || 0,
      });

    } catch (error) {
      console.error('Error fetching modules:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les modules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const generateSecretKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const handleAddModule = async () => {
    if (!newModule.anr_id || !newModule.device_id) {
      toast({
        title: "Erreur",
        description: "ANR ID et Device ID sont requis",
        variant: "destructive",
      });
      return;
    }

    try {
      const secretKey = generateSecretKey();

      const { error } = await supabase
        .from('door_modules')
        .insert({
          anr_id: newModule.anr_id,
          device_id: newModule.device_id,
          secret_key: secretKey,
          module_type: newModule.module_type,
          is_active: false,
        });

      if (error) throw error;

      toast({
        title: "Module ajouté",
        description: "Le module a été créé avec succès. Copiez la clé secrète pour le provisioning.",
      });

      setShowAddDialog(false);
      setNewModule({ anr_id: '', device_id: '', module_type: 'entry' });
      fetchModules();

    } catch (error) {
      console.error('Error adding module:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le module",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (module: DoorModule) => {
    try {
      const { error } = await supabase
        .from('door_modules')
        .update({ is_active: !module.is_active })
        .eq('id', module.id);

      if (error) throw error;

      toast({
        title: module.is_active ? "Module désactivé" : "Module activé",
      });

      fetchModules();

    } catch (error) {
      console.error('Error toggling module:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le module",
        variant: "destructive",
      });
    }
  };

  const handleUpdateConfig = async () => {
    if (!selectedModule) return;

    try {
      const { error } = await supabase
        .from('door_modules')
        .update({
          relay_duration_ms: selectedModule.relay_duration_ms,
          rssi_threshold: selectedModule.rssi_threshold,
        })
        .eq('id', selectedModule.id);

      if (error) throw error;

      toast({
        title: "Configuration mise à jour",
      });

      setShowConfigDialog(false);
      fetchModules();

    } catch (error) {
      console.error('Error updating config:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la configuration",
        variant: "destructive",
      });
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Supprimer ce module ? Cette action est irréversible.')) return;

    try {
      const { error } = await supabase
        .from('door_modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;

      toast({
        title: "Module supprimé",
      });

      fetchModules();

    } catch (error) {
      console.error('Error deleting module:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le module",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié",
      description: `${label} copié dans le presse-papiers`,
    });
  };

  const getModuleStatus = (module: DoorModule) => {
    if (!module.is_active) return { label: 'Inactif', variant: 'secondary' as const };
    if (!module.last_sync_at) return { label: 'Jamais sync', variant: 'outline' as const };
    
    const lastSync = new Date(module.last_sync_at);
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    if (lastSync > thirtyMinutesAgo) {
      return { label: 'En ligne', variant: 'default' as const };
    }
    return { label: 'Hors ligne', variant: 'destructive' as const };
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <DoorOpen className="h-8 w-8 text-primary" />
              Modules de porte
            </h1>
            <p className="text-muted-foreground">
              Gérez les modules ESP32 d'ouverture de porte
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchModules} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter module
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total_modules}</div>
              <p className="text-muted-foreground text-sm">Total modules</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.active_modules}</div>
              <p className="text-muted-foreground text-sm">En ligne</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.offline_modules}</div>
              <p className="text-muted-foreground text-sm">Hors ligne</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">{stats.accesses_today}</div>
              <p className="text-muted-foreground text-sm">Accès aujourd'hui</p>
            </CardContent>
          </Card>
        </div>

        {/* Modules Table */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des modules</CardTitle>
            <CardDescription>
              Tous les modules de porte configurés
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : modules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DoorOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun module configuré</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device ID</TableHead>
                    <TableHead>ANR</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Firmware</TableHead>
                    <TableHead>Dernière sync</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modules.map((module) => {
                    const status = getModuleStatus(module);
                    return (
                      <TableRow key={module.id}>
                        <TableCell className="font-mono text-sm">
                          {module.device_id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{module.anr?.code}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {module.anr?.address}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {module.module_type === 'entry' ? 'Entrée' : 
                             module.module_type === 'exit' ? 'Sortie' : 
                             module.module_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>
                            {status.variant === 'default' ? (
                              <Wifi className="h-3 w-3 mr-1" />
                            ) : (
                              <WifiOff className="h-3 w-3 mr-1" />
                            )}
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {module.firmware_version || '-'}
                        </TableCell>
                        <TableCell>
                          {module.last_sync_at ? (
                            <span title={format(new Date(module.last_sync_at), 'Pp', { locale: fr })}>
                              {formatDistanceToNow(new Date(module.last_sync_at), { 
                                addSuffix: true, 
                                locale: fr 
                              })}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(module.secret_key, 'Clé secrète')}
                              title="Copier clé secrète"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedModule(module);
                                setShowConfigDialog(true);
                              }}
                              title="Configuration"
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Switch
                              checked={module.is_active}
                              onCheckedChange={() => handleToggleActive(module)}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteModule(module.id)}
                              className="text-destructive"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add Module Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un module</DialogTitle>
              <DialogDescription>
                Configurez un nouveau module ESP32 d'ouverture de porte
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>ANR ID</Label>
                <Input
                  placeholder="UUID de l'ANR"
                  value={newModule.anr_id}
                  onChange={(e) => setNewModule({ ...newModule, anr_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Device ID (MAC BLE)</Label>
                <Input
                  placeholder="ANR_XXXXXX"
                  value={newModule.device_id}
                  onChange={(e) => setNewModule({ ...newModule, device_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Type de module</Label>
                <select
                  className="w-full p-2 border rounded-md bg-background"
                  value={newModule.module_type}
                  onChange={(e) => setNewModule({ ...newModule, module_type: e.target.value })}
                >
                  <option value="entry">Entrée</option>
                  <option value="exit">Sortie</option>
                  <option value="both">Entrée/Sortie</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddModule}>
                Créer le module
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Config Dialog */}
        <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configuration du module</DialogTitle>
              <DialogDescription>
                Paramètres avancés du module {selectedModule?.device_id}
              </DialogDescription>
            </DialogHeader>
            {selectedModule && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Durée du relais (ms)</Label>
                  <Input
                    type="number"
                    value={selectedModule.relay_duration_ms || 1000}
                    onChange={(e) => setSelectedModule({
                      ...selectedModule,
                      relay_duration_ms: parseInt(e.target.value)
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Durée d'activation du relais lors de l'ouverture
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Seuil RSSI (dBm)</Label>
                  <Input
                    type="number"
                    value={selectedModule.rssi_threshold || -75}
                    onChange={(e) => setSelectedModule({
                      ...selectedModule,
                      rssi_threshold: parseInt(e.target.value)
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Signal BLE minimum requis (ex: -75 = proximité normale)
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Clé secrète</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedModule.secret_key, 'Clé secrète')}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copier
                    </Button>
                  </div>
                  <code className="text-xs break-all">{selectedModule.secret_key}</code>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleUpdateConfig}>
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default DoorModulesPage;
