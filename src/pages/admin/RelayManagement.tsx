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
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const RelayManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("relay-points");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  // Fetch relay points
  const { data: relayPoints, isLoading: loadingRelays } = useQuery({
    queryKey: ['admin_relay_points'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('relay_points')
        .select(`
          *,
          anrs:anr_id (code, address)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
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

  // Verify relay point mutation
  const verifyRelay = useMutation({
    mutationFn: async (relayId: string) => {
      const { error } = await supabase
        .from('relay_points')
        .update({ is_verified: true, verified_at: new Date().toISOString() })
        .eq('id', relayId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Point relais vérifié");
      queryClient.invalidateQueries({ queryKey: ['admin_relay_points'] });
    },
  });

  // Toggle relay active status
  const toggleRelayActive = useMutation({
    mutationFn: async ({ relayId, isActive }: { relayId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('relay_points')
        .update({ is_active: isActive })
        .eq('id', relayId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      queryClient.invalidateQueries({ queryKey: ['admin_relay_points'] });
    },
  });

  // Verify carrier mutation
  const verifyCarrier = useMutation({
    mutationFn: async (carrierId: string) => {
      const { error } = await supabase
        .from('carriers')
        .update({ is_verified: true, verified_at: new Date().toISOString() })
        .eq('id', carrierId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Transporteur vérifié");
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

  // Stats
  const stats = {
    totalRelays: relayPoints?.length || 0,
    activeRelays: relayPoints?.filter(r => r.is_active && r.is_verified).length || 0,
    totalCarriers: carriers?.length || 0,
    verifiedCarriers: carriers?.filter(c => c.is_verified).length || 0,
    totalParcels: parcels?.length || 0,
    pendingParcels: parcels?.filter(p => p.status === 'pending' || p.status === 'deposited').length || 0,
    totalInvoices: carrierInvoices?.length || 0,
    pendingInvoicesAmount: carrierInvoices
      ?.filter(i => i.status !== 'paid')
      .reduce((sum, i) => sum + (i.amount_ttc || 0), 0) || 0,
  };

  const filteredRelays = relayPoints?.filter(r => 
    r.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.anrs?.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCarriers = carriers?.filter(c =>
    c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredParcels = parcels?.filter(p =>
    p.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInvoices = carrierInvoices?.filter(i => {
    const matchesSearch = 
      i.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.carriers?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = invoiceStatusFilter === 'all' || i.status === invoiceStatusFilter;
    return matchesSearch && matchesStatus;
  });

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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <MapPin className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{stats.totalRelays}</p>
            <p className="text-xs text-muted-foreground">Points relais</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold">{stats.activeRelays}</p>
            <p className="text-xs text-muted-foreground">Actifs & vérifiés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Truck className="h-6 w-6 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{stats.totalCarriers}</p>
            <p className="text-xs text-muted-foreground">Transporteurs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold">{stats.verifiedCarriers}</p>
            <p className="text-xs text-muted-foreground">Vérifiés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="h-6 w-6 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold">{stats.totalParcels}</p>
            <p className="text-xs text-muted-foreground">Colis total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="h-6 w-6 mx-auto text-yellow-500 mb-2" />
            <p className="text-2xl font-bold">{stats.pendingParcels}</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-6 w-6 mx-auto text-purple-500 mb-2" />
            <p className="text-2xl font-bold">{stats.totalInvoices}</p>
            <p className="text-xs text-muted-foreground">Factures</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 mx-auto text-red-500 mb-2" />
            <p className="text-2xl font-bold">{stats.pendingInvoicesAmount.toFixed(0)}€</p>
            <p className="text-xs text-muted-foreground">À encaisser</p>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="relay-points">Points Relais</TabsTrigger>
          <TabsTrigger value="carriers">Transporteurs</TabsTrigger>
          <TabsTrigger value="parcels">Colis</TabsTrigger>
          <TabsTrigger value="invoices">Factures</TabsTrigger>
        </TabsList>

        {/* Relay Points Tab */}
        <TabsContent value="relay-points" className="space-y-4">
          {loadingRelays ? (
            <p className="text-center py-8 text-muted-foreground">Chargement...</p>
          ) : filteredRelays?.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Aucun point relais trouvé</p>
          ) : (
            <div className="space-y-3">
              {filteredRelays?.map((relay) => (
                <Card key={relay.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{relay.display_name}</h3>
                          {relay.is_verified ? (
                            <Badge variant="default" className="bg-green-500">Vérifié</Badge>
                          ) : (
                            <Badge variant="secondary">Non vérifié</Badge>
                          )}
                          {relay.is_active ? (
                            <Badge variant="outline" className="border-green-500 text-green-600">Actif</Badge>
                          ) : (
                            <Badge variant="outline" className="border-red-500 text-red-600">Inactif</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{relay.anrs?.address}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ANR: {relay.anrs?.code} • Capacité: {relay.current_capacity}/{relay.max_capacity}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {relay.total_parcels_handled} colis traités
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {relay.total_earnings?.toFixed(2)}€ gagnés
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!relay.is_verified && (
                          <Button 
                            size="sm" 
                            onClick={() => verifyRelay.mutate(relay.id)}
                            disabled={verifyRelay.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Vérifier
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={relay.is_active ? "destructive" : "default"}
                          onClick={() => toggleRelayActive.mutate({ 
                            relayId: relay.id, 
                            isActive: !relay.is_active 
                          })}
                        >
                          {relay.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
              <select
                value={invoiceStatusFilter}
                onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Tous les statuts</option>
                <option value="draft">Brouillon</option>
                <option value="sent">Envoyée</option>
                <option value="paid">Payée</option>
                <option value="overdue">En retard</option>
              </select>
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
                        {/* Line items detail */}
                        {invoice.line_items && Array.isArray(invoice.line_items) && invoice.line_items.length > 0 && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                            {(invoice.line_items as any[]).map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between">
                                <span>{item.description}</span>
                                <span>{item.quantity} × {item.unit_price?.toFixed(2)}€ = {item.total?.toFixed(2)}€</span>
                              </div>
                            ))}
                          </div>
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
    </div>
    </AdminLayout>
  );
};

export default RelayManagement;
