import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Package, 
  MapPin, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Search,
  RefreshCw,
  Eye,
  Ban,
  DollarSign,
  FileText,
  Send,
  Download,
  Calendar,
  Clock,
  User,
  Building2,
  Shield,
  AlertTriangle,
  FileCheck,
  GraduationCap,
  QrCode,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type RelayStatus = 'draft' | 'identity_verified' | 'contract_signed' | 'anr_assigned' | 'training_validated' | 'active' | 'suspended';

const STATUS_LABELS: Record<RelayStatus, string> = {
  draft: 'Brouillon',
  identity_verified: 'KYC Vérifié',
  contract_signed: 'Contrat signé',
  anr_assigned: 'ANR attribué',
  training_validated: 'Formation OK',
  active: 'Actif',
  suspended: 'Suspendu'
};

const STATUS_COLORS: Record<RelayStatus, string> = {
  draft: 'bg-gray-500',
  identity_verified: 'bg-blue-500',
  contract_signed: 'bg-indigo-500',
  anr_assigned: 'bg-purple-500',
  training_validated: 'bg-cyan-500',
  active: 'bg-green-500',
  suspended: 'bg-red-500'
};

const RelayManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("all");
  const [selectedRelay, setSelectedRelay] = useState<any>(null);
  const [showKYCDialog, setShowKYCDialog] = useState(false);
  const [showANRDialog, setShowANRDialog] = useState(false);
  const queryClient = useQueryClient();

  // Fetch relay points with all new fields
  const { data: relayPoints, isLoading: loadingRelays } = useQuery({
    queryKey: ['admin_relay_points'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('relay_points')
        .select(`
          *,
          anrs:anr_id (id, code, address, nfc_serial)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch available ANRs for assignment
  const { data: availableANRs } = useQuery({
    queryKey: ['available_anrs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anrs')
        .select('id, code, address, nfc_serial')
        .order('address');
      if (error) throw error;
      // Filter out ANRs already assigned to relay points
      const assignedAnrIds = relayPoints?.map(r => r.anr_id).filter(Boolean) || [];
      return data?.filter(anr => !assignedAnrIds.includes(anr.id)) || [];
    },
    enabled: !!relayPoints,
  });

  // Fetch carriers
  const { data: carriers, isLoading: loadingCarriers } = useQuery({
    queryKey: ['admin_carriers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('carriers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch parcels
  const { data: parcels, isLoading: loadingParcels } = useQuery({
    queryKey: ['admin_parcels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parcels')
        .select(`
          *,
          relay_points:relay_point_id (display_name),
          carriers:carrier_id (company_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Fetch carrier invoices
  const { data: carrierInvoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ['admin_carrier_invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('carrier_invoices')
        .select(`
          *,
          carriers:carrier_id (company_name, contact_email)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Update relay status mutation
  const updateRelayStatus = useMutation({
    mutationFn: async ({ relayId, status, additionalData }: { 
      relayId: string; 
      status: RelayStatus;
      additionalData?: Record<string, any>;
    }) => {
      const updatePayload: any = { status };
      
      if (status === 'identity_verified') {
        updatePayload.kyc_verified_at = new Date().toISOString();
      }
      if (additionalData) {
        Object.assign(updatePayload, additionalData);
      }
      
      const { error } = await supabase
        .from('relay_points')
        .update(updatePayload)
        .eq('id', relayId);
      if (error) throw error;

      // Get relay info for notification
      const { data: relay } = await supabase
        .from('relay_points')
        .select('display_name, user_id, anrs:anr_id (address)')
        .eq('id', relayId)
        .single();

      // Send notification email based on status
      if (relay?.user_id) {
        const emailType = {
          identity_verified: 'relay_kyc_approved',
          anr_assigned: 'relay_anr_assigned',
          active: 'relay_activated',
          suspended: 'relay_suspended'
        }[status];

        if (emailType) {
          await supabase.functions.invoke('notify-relay-carrier', {
            body: {
              type: emailType,
              data: {
                user_id: relay.user_id,
                relay_name: relay.display_name,
                relay_address: Array.isArray(relay.anrs) ? relay.anrs[0]?.address : relay.anrs?.address
              }
            }
          });
        }
      }
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      queryClient.invalidateQueries({ queryKey: ['admin_relay_points'] });
      setShowKYCDialog(false);
      setShowANRDialog(false);
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  // Assign ANR mutation
  const assignANR = useMutation({
    mutationFn: async ({ relayId, anrId }: { relayId: string; anrId: string }) => {
      const { error } = await supabase
        .from('relay_points')
        .update({ 
          anr_id: anrId,
          status: 'anr_assigned' as RelayStatus
        })
        .eq('id', relayId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ANR attribué avec succès");
      queryClient.invalidateQueries({ queryKey: ['admin_relay_points'] });
      queryClient.invalidateQueries({ queryKey: ['available_anrs'] });
      setShowANRDialog(false);
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  // Verify carrier mutation
  const verifyCarrier = useMutation({
    mutationFn: async (carrierId: string) => {
      const { data: carrier, error: fetchError } = await supabase
        .from('carriers')
        .select('company_name, contact_email')
        .eq('id', carrierId)
        .single();
      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('carriers')
        .update({ is_verified: true, verified_at: new Date().toISOString() })
        .eq('id', carrierId);
      if (error) throw error;

      if (carrier?.contact_email) {
        await supabase.functions.invoke('notify-relay-carrier', {
          body: {
            type: 'carrier_verification_approved',
            data: {
              email: carrier.contact_email,
              carrier_name: carrier.company_name
            }
          }
        });
      }
    },
    onSuccess: () => {
      toast.success("Transporteur vérifié et notifié");
      queryClient.invalidateQueries({ queryKey: ['admin_carriers'] });
    },
  });

  // Update invoice status mutation
  const updateInvoiceStatus = useMutation({
    mutationFn: async ({ invoiceId, status, paidAt }: { invoiceId: string; status: string; paidAt?: string }) => {
      const updateData: any = { status };
      if (paidAt) updateData.paid_at = paidAt;
      
      const { error } = await supabase
        .from('carrier_invoices')
        .update(updateData)
        .eq('id', invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Statut de facture mis à jour");
      queryClient.invalidateQueries({ queryKey: ['admin_carrier_invoices'] });
    },
  });

  // Generate invoices mutation
  const generateInvoices = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('process-carrier-invoice');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${data.summary.invoices_created} facture(s) générée(s)`);
      queryClient.invalidateQueries({ queryKey: ['admin_carrier_invoices'] });
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  // Filter relays by status category
  const pendingRelays = relayPoints?.filter(r => 
    ['draft', 'identity_verified', 'contract_signed', 'anr_assigned', 'training_validated'].includes(r.status || 'draft')
  );
  const activeRelays = relayPoints?.filter(r => r.status === 'active');
  const suspendedRelays = relayPoints?.filter(r => r.status === 'suspended');

  // Stats
  const stats = {
    totalRelays: relayPoints?.length || 0,
    pendingRelays: pendingRelays?.length || 0,
    activeRelays: activeRelays?.length || 0,
    suspendedRelays: suspendedRelays?.length || 0,
    totalCarriers: carriers?.length || 0,
    verifiedCarriers: carriers?.filter(c => c.is_verified).length || 0,
    totalParcels: parcels?.length || 0,
    pendingParcels: parcels?.filter(p => p.status === 'pending' || p.status === 'deposited').length || 0,
    totalInvoices: carrierInvoices?.length || 0,
    pendingInvoicesAmount: carrierInvoices
      ?.filter(i => i.status !== 'paid')
      .reduce((sum, i) => sum + (i.amount_ttc || 0), 0) || 0,
  };

  const filterBySearch = (items: any[] | undefined, fields: string[]) => {
    if (!items) return [];
    if (!searchTerm) return items;
    return items.filter(item => 
      fields.some(field => {
        const value = field.includes('.') 
          ? field.split('.').reduce((obj, key) => obj?.[key], item)
          : item[field];
        return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  };

  const filteredPendingRelays = filterBySearch(pendingRelays, ['display_name', 'anrs.address', 'company_name']);
  const filteredActiveRelays = filterBySearch(activeRelays, ['display_name', 'anrs.address', 'company_name']);
  const filteredSuspendedRelays = filterBySearch(suspendedRelays, ['display_name', 'anrs.address', 'company_name']);
  const filteredCarriers = filterBySearch(carriers, ['company_name', 'contact_email']);
  const filteredParcels = filterBySearch(parcels, ['tracking_number', 'recipient_name']);
  const filteredInvoices = carrierInvoices?.filter(i => {
    const matchesSearch = 
      i.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.carriers?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = invoiceStatusFilter === 'all' || i.status === invoiceStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: RelayStatus) => (
    <Badge className={`${STATUS_COLORS[status]} text-white`}>
      {STATUS_LABELS[status]}
    </Badge>
  );

  const getRelayTypeBadge = (type: string | null) => (
    <Badge variant="outline" className={type === 'professional' ? 'border-blue-500 text-blue-600' : 'border-orange-500 text-orange-600'}>
      {type === 'professional' ? (
        <><Building2 className="h-3 w-3 mr-1" /> Pro</>
      ) : (
        <><User className="h-3 w-3 mr-1" /> Particulier</>
      )}
    </Badge>
  );

  const getNextAction = (relay: any): { label: string; action: () => void; icon: any; variant?: any } | null => {
    const status = relay.status as RelayStatus;
    
    switch (status) {
      case 'draft':
        return {
          label: 'Vérifier KYC',
          action: () => { setSelectedRelay(relay); setShowKYCDialog(true); },
          icon: Shield,
          variant: 'default'
        };
      case 'identity_verified':
        if (!relay.contract_signed_at) {
          return {
            label: 'En attente contrat',
            action: () => {},
            icon: FileCheck,
            variant: 'secondary'
          };
        }
        return null;
      case 'contract_signed':
        return {
          label: 'Attribuer ANR',
          action: () => { setSelectedRelay(relay); setShowANRDialog(true); },
          icon: QrCode,
          variant: 'default'
        };
      case 'anr_assigned':
        return {
          label: 'En attente formation',
          action: () => {},
          icon: GraduationCap,
          variant: 'secondary'
        };
      case 'training_validated':
        return {
          label: 'Activer',
          action: () => updateRelayStatus.mutate({ relayId: relay.id, status: 'active' }),
          icon: CheckCircle,
          variant: 'default'
        };
      default:
        return null;
    }
  };

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Brouillon</Badge>;
      case 'sent':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Envoyée</Badge>;
      case 'paid':
        return <Badge variant="default" className="bg-green-500">Payée</Badge>;
      case 'overdue':
        return <Badge variant="destructive">En retard</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderRelayCard = (relay: any, showActions = true) => {
    const nextAction = getNextAction(relay);
    const anrData = Array.isArray(relay.anrs) ? relay.anrs[0] : relay.anrs;
    
    return (
      <Card key={relay.id} className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h3 className="font-semibold truncate">{relay.display_name || relay.company_name || 'Sans nom'}</h3>
                {getStatusBadge(relay.status || 'draft')}
                {getRelayTypeBadge(relay.relay_type)}
              </div>
              
              <p className="text-sm text-muted-foreground truncate">
                {anrData?.address || relay.address || 'Adresse non renseignée'}
              </p>
              
              {anrData?.code && (
                <p className="text-xs text-muted-foreground mt-1">
                  ANR: <span className="font-mono">{anrData.code}</span>
                  {anrData.nfc_serial && <> • NFC: {anrData.nfc_serial}</>}
                </p>
              )}
              
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                {relay.relay_type === 'professional' && relay.siret && (
                  <span>SIRET: {relay.siret}</span>
                )}
                <span>
                  <Calendar className="h-3 w-3 inline mr-1" />
                  {format(new Date(relay.created_at), 'dd/MM/yyyy', { locale: fr })}
                </span>
                {relay.total_parcels_handled > 0 && (
                  <span>
                    <Package className="h-3 w-3 inline mr-1" />
                    {relay.total_parcels_handled} colis
                  </span>
                )}
                {relay.total_earnings > 0 && (
                  <span className="text-green-600">
                    <DollarSign className="h-3 w-3 inline" />
                    {relay.total_earnings.toFixed(2)}€
                  </span>
                )}
              </div>

              {/* Progress indicator for pending relays */}
              {['draft', 'identity_verified', 'contract_signed', 'anr_assigned', 'training_validated'].includes(relay.status) && (
                <div className="mt-3 flex items-center gap-1">
                  {['draft', 'identity_verified', 'contract_signed', 'anr_assigned', 'training_validated', 'active'].map((step, idx) => (
                    <div key={step} className="flex items-center">
                      <div className={`h-2 w-2 rounded-full ${
                        Object.keys(STATUS_LABELS).indexOf(relay.status) >= idx 
                          ? 'bg-primary' 
                          : 'bg-muted'
                      }`} />
                      {idx < 5 && <div className={`h-0.5 w-4 ${
                        Object.keys(STATUS_LABELS).indexOf(relay.status) > idx 
                          ? 'bg-primary' 
                          : 'bg-muted'
                      }`} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {showActions && (
              <div className="flex flex-col gap-2">
                {nextAction && nextAction.action && (
                  <Button
                    size="sm"
                    variant={nextAction.variant || 'default'}
                    onClick={nextAction.action}
                    disabled={updateRelayStatus.isPending || !nextAction.action.toString().includes('mutate') && nextAction.variant === 'secondary'}
                  >
                    <nextAction.icon className="h-4 w-4 mr-1" />
                    {nextAction.label}
                  </Button>
                )}
                
                {relay.status === 'active' && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => updateRelayStatus.mutate({ relayId: relay.id, status: 'suspended' })}
                    disabled={updateRelayStatus.isPending}
                  >
                    <Ban className="h-4 w-4 mr-1" />
                    Suspendre
                  </Button>
                )}
                
                {relay.status === 'suspended' && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => updateRelayStatus.mutate({ relayId: relay.id, status: 'active' })}
                    disabled={updateRelayStatus.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Réactiver
                  </Button>
                )}
                
                <Button size="sm" variant="outline">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestion Module Relais</h1>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => queryClient.invalidateQueries()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pendingRelays}</p>
                <p className="text-xs text-muted-foreground">Demandes en attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.activeRelays}</p>
                <p className="text-xs text-muted-foreground">Relais actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Ban className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.suspendedRelays}</p>
                <p className="text-xs text-muted-foreground">Suspendus</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Truck className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.verifiedCarriers}/{stats.totalCarriers}</p>
                <p className="text-xs text-muted-foreground">Transporteurs vérifiés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pendingInvoicesAmount.toFixed(0)}€</p>
                <p className="text-xs text-muted-foreground">À encaisser</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="pending" className="relative">
            Demandes
            {stats.pendingRelays > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center bg-yellow-500 text-white">
                {stats.pendingRelays}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">Relais actifs</TabsTrigger>
          <TabsTrigger value="suspended">Suspendus</TabsTrigger>
          <TabsTrigger value="carriers">Transporteurs</TabsTrigger>
          <TabsTrigger value="parcels">Colis</TabsTrigger>
          <TabsTrigger value="invoices">Factures</TabsTrigger>
        </TabsList>

        {/* Pending Relays Tab */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Workflow de validation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-gray-500 text-white flex items-center justify-center text-xs">1</div>
                  <span>Brouillon</span>
                </div>
                <ArrowRight className="h-4 w-4" />
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">2</div>
                  <span>KYC</span>
                </div>
                <ArrowRight className="h-4 w-4" />
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs">3</div>
                  <span>Contrat</span>
                </div>
                <ArrowRight className="h-4 w-4" />
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs">4</div>
                  <span>ANR</span>
                </div>
                <ArrowRight className="h-4 w-4" />
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs">5</div>
                  <span>Formation</span>
                </div>
                <ArrowRight className="h-4 w-4" />
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">6</div>
                  <span>Actif</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {loadingRelays ? (
            <p className="text-center py-8 text-muted-foreground">Chargement...</p>
          ) : filteredPendingRelays?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-lg font-medium">Aucune demande en attente</p>
                <p className="text-muted-foreground">Toutes les demandes ont été traitées</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredPendingRelays?.map((relay) => renderRelayCard(relay))}
            </div>
          )}
        </TabsContent>

        {/* Active Relays Tab */}
        <TabsContent value="active" className="space-y-4">
          {loadingRelays ? (
            <p className="text-center py-8 text-muted-foreground">Chargement...</p>
          ) : filteredActiveRelays?.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Aucun relais actif</p>
          ) : (
            <div className="space-y-3">
              {filteredActiveRelays?.map((relay) => renderRelayCard(relay))}
            </div>
          )}
        </TabsContent>

        {/* Suspended Relays Tab */}
        <TabsContent value="suspended" className="space-y-4">
          {loadingRelays ? (
            <p className="text-center py-8 text-muted-foreground">Chargement...</p>
          ) : filteredSuspendedRelays?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-lg font-medium">Aucun relais suspendu</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredSuspendedRelays?.map((relay) => renderRelayCard(relay))}
            </div>
          )}
        </TabsContent>

        {/* Carriers Tab */}
        <TabsContent value="carriers" className="space-y-4">
          {loadingCarriers ? (
            <p className="text-center py-8 text-muted-foreground">Chargement...</p>
          ) : filteredCarriers?.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Aucun transporteur trouvé</p>
          ) : (
            <div className="space-y-3">
              {filteredCarriers?.map((carrier) => (
                <Card key={carrier.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{carrier.company_name}</h3>
                          {carrier.is_verified ? (
                            <Badge variant="default" className="bg-green-500">Vérifié</Badge>
                          ) : (
                            <Badge variant="secondary">Non vérifié</Badge>
                          )}
                          {carrier.api_enabled && (
                            <Badge variant="outline">API Active</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{carrier.contact_email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          SIRET: {carrier.siret || 'Non renseigné'} • {carrier.total_parcels} colis
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!carrier.is_verified && (
                          <Button 
                            size="sm" 
                            onClick={() => verifyCarrier.mutate(carrier.id)}
                            disabled={verifyCarrier.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Vérifier
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Parcels Tab */}
        <TabsContent value="parcels" className="space-y-4">
          {loadingParcels ? (
            <p className="text-center py-8 text-muted-foreground">Chargement...</p>
          ) : filteredParcels?.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Aucun colis trouvé</p>
          ) : (
            <div className="space-y-3">
              {filteredParcels?.map((parcel) => (
                <Card key={parcel.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-mono text-sm">{parcel.tracking_number}</h3>
                          <Badge variant={
                            parcel.status === 'delivered' ? 'default' :
                            parcel.status === 'deposited' ? 'secondary' :
                            parcel.status === 'picked_up' ? 'outline' : 'destructive'
                          }>
                            {parcel.status === 'pending' && 'En attente'}
                            {parcel.status === 'deposited' && 'Déposé'}
                            {parcel.status === 'picked_up' && 'Retiré'}
                            {parcel.status === 'delivered' && 'Livré'}
                            {parcel.status === 'returned' && 'Retourné'}
                          </Badge>
                        </div>
                        <p className="text-sm">{parcel.recipient_name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Relais: {parcel.relay_points?.display_name || 'N/A'} • 
                          Transporteur: {parcel.carriers?.company_name || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Créé le {format(new Date(parcel.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="sent">Envoyée</SelectItem>
                  <SelectItem value="paid">Payée</SelectItem>
                  <SelectItem value="overdue">En retard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={() => generateInvoices.mutate()}
              disabled={generateInvoices.isPending}
            >
              {generateInvoices.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Générer factures du mois
            </Button>
          </div>

          {loadingInvoices ? (
            <p className="text-center py-8 text-muted-foreground">Chargement...</p>
          ) : filteredInvoices?.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Aucune facture trouvée</p>
          ) : (
            <div className="space-y-3">
              {filteredInvoices?.map((invoice) => (
                <Card key={invoice.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-mono text-sm">{invoice.invoice_number}</h3>
                          {getInvoiceStatusBadge(invoice.status)}
                        </div>
                        <p className="text-sm font-medium">{invoice.carriers?.company_name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Période: {format(new Date(invoice.period_start), 'dd/MM/yyyy', { locale: fr })} - {format(new Date(invoice.period_end), 'dd/MM/yyyy', { locale: fr })}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {invoice.parcels_count} colis
                          </span>
                          <span className="font-medium">
                            {invoice.amount_ht?.toFixed(2)}€ HT
                          </span>
                          <span className="font-bold text-primary">
                            {invoice.amount_ttc?.toFixed(2)}€ TTC
                          </span>
                        </div>
                        {invoice.due_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            Échéance: {format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: fr })}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {invoice.status === 'draft' && (
                          <Button 
                            size="sm" 
                            onClick={() => updateInvoiceStatus.mutate({ 
                              invoiceId: invoice.id, 
                              status: 'sent' 
                            })}
                            disabled={updateInvoiceStatus.isPending}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Envoyer
                          </Button>
                        )}
                        {invoice.status === 'sent' && (
                          <Button 
                            size="sm" 
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => updateInvoiceStatus.mutate({ 
                              invoiceId: invoice.id, 
                              status: 'paid',
                              paidAt: new Date().toISOString()
                            })}
                            disabled={updateInvoiceStatus.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Marquer payée
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* KYC Verification Dialog */}
      <Dialog open={showKYCDialog} onOpenChange={setShowKYCDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Vérification KYC - {selectedRelay?.display_name || selectedRelay?.company_name}
            </DialogTitle>
            <DialogDescription>
              Vérifiez les documents d'identité avant d'approuver ce relais
            </DialogDescription>
          </DialogHeader>

          {selectedRelay && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Type de relais</p>
                  {getRelayTypeBadge(selectedRelay.relay_type)}
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Adresse</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedRelay.address || selectedRelay.anrs?.address || 'Non renseignée'}
                  </p>
                </div>
              </div>

              {selectedRelay.relay_type === 'professional' ? (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium">Informations entreprise</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Raison sociale:</span>
                      <p className="font-medium">{selectedRelay.company_name || 'Non renseignée'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Forme juridique:</span>
                      <p className="font-medium">{selectedRelay.legal_form || 'Non renseignée'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">SIRET:</span>
                      <p className="font-medium font-mono">{selectedRelay.siret || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Représentant légal:</span>
                      <p className="font-medium">{selectedRelay.legal_representative_name || 'Non renseigné'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium">Informations particulier</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Nom:</span>
                      <p className="font-medium">{selectedRelay.display_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">IBAN:</span>
                      <p className="font-medium font-mono">{selectedRelay.iban ? '****' + selectedRelay.iban.slice(-4) : 'Non renseigné'}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="font-medium">Documents</h4>
                <div className="grid grid-cols-2 gap-3">
                  {selectedRelay.id_document_url ? (
                    <Button variant="outline" className="h-24 flex-col gap-2" asChild>
                      <a href={selectedRelay.id_document_url} target="_blank" rel="noopener noreferrer">
                        <FileCheck className="h-8 w-8 text-green-500" />
                        <span className="text-xs">Pièce d'identité</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  ) : (
                    <div className="h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                      <XCircle className="h-8 w-8" />
                      <span className="text-xs">Pièce d'identité manquante</span>
                    </div>
                  )}
                  {selectedRelay.address_proof_url ? (
                    <Button variant="outline" className="h-24 flex-col gap-2" asChild>
                      <a href={selectedRelay.address_proof_url} target="_blank" rel="noopener noreferrer">
                        <FileCheck className="h-8 w-8 text-green-500" />
                        <span className="text-xs">Justificatif domicile</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  ) : (
                    <div className="h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                      <XCircle className="h-8 w-8" />
                      <span className="text-xs">Justificatif manquant</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKYCDialog(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                // Could add rejection logic here
                toast.info("Fonctionnalité de rejet à implémenter");
              }}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Rejeter
            </Button>
            <Button 
              onClick={() => updateRelayStatus.mutate({ 
                relayId: selectedRelay.id, 
                status: 'identity_verified' 
              })}
              disabled={updateRelayStatus.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approuver KYC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ANR Assignment Dialog */}
      <Dialog open={showANRDialog} onOpenChange={setShowANRDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Attribuer ANR - {selectedRelay?.display_name}
            </DialogTitle>
            <DialogDescription>
              Sélectionnez l'ANR à attribuer à ce point relais
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">ANR disponibles</label>
              {availableANRs && availableANRs.length > 0 ? (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {availableANRs.map((anr) => (
                    <Card 
                      key={anr.id} 
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => assignANR.mutate({ relayId: selectedRelay.id, anrId: anr.id })}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-mono font-medium">{anr.code}</p>
                            <p className="text-sm text-muted-foreground">{anr.address}</p>
                            {anr.nfc_serial && (
                              <p className="text-xs text-muted-foreground">NFC: {anr.nfc_serial}</p>
                            )}
                          </div>
                          <Button size="sm" disabled={assignANR.isPending}>
                            Attribuer
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-muted-foreground">
                  Aucun ANR disponible
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowANRDialog(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
};

export default RelayManagement;
