import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Package, Search, Download, Filter, Eye, MapPin, Clock, CheckCircle, Truck, RotateCcw, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { RouteOptimizationMap } from "@/components/carrier/RouteOptimizationMap";

interface Parcel {
  id: string;
  tracking_number: string;
  status: string;
  recipient_name: string;
  created_at: string;
  deposited_at: string | null;
  delivered_at: string | null;
  relay_point?: { id: string; display_name: string };
  proofs?: Proof[];
}

interface Proof {
  id: string;
  proof_type: string;
  timestamp_utc: string;
  geo_latitude: number | null;
  geo_longitude: number | null;
  actor_name: string | null;
  recipient_name: string | null;
  scan_method: string;
  proof_hash: string;
  notes: string | null;
}

const statusLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  created: { label: "Créé", color: "bg-gray-500", icon: <Package className="w-4 h-4" /> },
  in_transit: { label: "En transit", color: "bg-blue-500", icon: <Truck className="w-4 h-4" /> },
  deposited_at_relay: { label: "Au relais", color: "bg-orange-500", icon: <MapPin className="w-4 h-4" /> },
  available_for_pickup: { label: "Disponible", color: "bg-yellow-500", icon: <Clock className="w-4 h-4" /> },
  delivered: { label: "Livré", color: "bg-green-500", icon: <CheckCircle className="w-4 h-4" /> },
  returned: { label: "Retourné", color: "bg-red-500", icon: <RotateCcw className="w-4 h-4" /> },
};

// Mock data - In production, this would come from carrier-api
const mockParcels: Parcel[] = [
  {
    id: "1",
    tracking_number: "ANR-2024-001234",
    status: "delivered",
    recipient_name: "Jean Dupont",
    created_at: "2024-12-15T10:00:00Z",
    deposited_at: "2024-12-15T14:00:00Z",
    delivered_at: "2024-12-16T09:30:00Z",
    relay_point: { id: "r1", display_name: "Relais Martin" },
    proofs: [
      {
        id: "p1",
        proof_type: "deposit",
        timestamp_utc: "2024-12-15T14:00:00Z",
        geo_latitude: 48.8566,
        geo_longitude: 2.3522,
        actor_name: "Livreur Pierre",
        recipient_name: null,
        scan_method: "nfc",
        proof_hash: "abc123def456...",
        notes: null
      },
      {
        id: "p2",
        proof_type: "pickup",
        timestamp_utc: "2024-12-16T09:30:00Z",
        geo_latitude: 48.8566,
        geo_longitude: 2.3522,
        actor_name: "Relais Martin",
        recipient_name: "Jean Dupont",
        scan_method: "qr",
        proof_hash: "xyz789abc012...",
        notes: "Remis en main propre"
      }
    ]
  }
];

// Mock delivery points for route optimization
const mockDeliveryPoints = [
  { id: "dp1", name: "Relais Martin", address: "15 Rue de la Paix, Paris", latitude: 48.8698, longitude: 2.3308, type: 'relay' as const, parcelsCount: 3 },
  { id: "dp2", name: "Jean Dupont", address: "42 Avenue des Champs-Élysées, Paris", latitude: 48.8738, longitude: 2.2950, type: 'recipient' as const },
  { id: "dp3", name: "Relais Express", address: "8 Place de la Bastille, Paris", latitude: 48.8533, longitude: 2.3692, type: 'relay' as const, parcelsCount: 5 },
  { id: "dp4", name: "Marie Lambert", address: "25 Rue de Rivoli, Paris", latitude: 48.8566, longitude: 2.3522, type: 'recipient' as const },
  { id: "dp5", name: "Épicerie du Coin", address: "100 Boulevard Voltaire, Paris", latitude: 48.8630, longitude: 2.3795, type: 'relay' as const, parcelsCount: 2 },
];

const CarrierDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>("parcels");
  
  const [parcels, setParcels] = useState<Parcel[]>(mockParcels);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('tracking') || '');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredParcels = parcels.filter(p => {
    const matchesSearch = p.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.recipient_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: parcels.length,
    inTransit: parcels.filter(p => p.status === 'in_transit').length,
    atRelay: parcels.filter(p => p.status === 'deposited_at_relay').length,
    delivered: parcels.filter(p => p.status === 'delivered').length,
  };

  const exportProofs = (parcel: Parcel, format: 'json' | 'csv') => {
    if (!parcel.proofs) return;
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(parcel.proofs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proofs-${parcel.tracking_number}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['ID', 'Type', 'Date', 'Latitude', 'Longitude', 'Acteur', 'Destinataire', 'Méthode', 'Hash'];
      const rows = parcel.proofs.map(p => [
        p.id, p.proof_type, p.timestamp_utc, p.geo_latitude, p.geo_longitude,
        p.actor_name, p.recipient_name, p.scan_method, p.proof_hash
      ]);
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proofs-${parcel.tracking_number}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    
    toast({ title: "Export terminé", description: `Fichier ${format.toUpperCase()} téléchargé` });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-primary-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Dashboard Transporteur</h1>
            <p className="text-sm text-primary-foreground/70">Suivi des colis et preuves</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total colis</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-500">{stats.inTransit}</p>
              <p className="text-sm text-muted-foreground">En transit</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-500">{stats.atRelay}</p>
              <p className="text-sm text-muted-foreground">Au relais</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-500">{stats.delivered}</p>
              <p className="text-sm text-muted-foreground">Livrés</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="parcels" className="flex-1">
              <Package className="w-4 h-4 mr-2" />
              Colis
            </TabsTrigger>
            <TabsTrigger value="route" className="flex-1">
              <Route className="w-4 h-4 mr-2" />
              Optimisation tournée
            </TabsTrigger>
          </TabsList>

          <TabsContent value="parcels" className="space-y-4 mt-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par n° tracking ou destinataire..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filtrer par statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      {Object.entries(statusLabels).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Parcels list */}
            <div className="space-y-4">
              {filteredParcels.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucun colis trouvé</p>
                  </CardContent>
                </Card>
              ) : (
                filteredParcels.map(parcel => {
                  const status = statusLabels[parcel.status] || statusLabels.created;
                  return (
                    <Card key={parcel.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono font-bold">{parcel.tracking_number}</span>
                              <Badge className={`${status.color} text-white`}>
                                {status.icon}
                                <span className="ml-1">{status.label}</span>
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {parcel.recipient_name}
                              {parcel.relay_point && ` • ${parcel.relay_point.display_name}`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Créé le {format(new Date(parcel.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                            </p>
                          </div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedParcel(parcel)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Détails
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Colis {parcel.tracking_number}</DialogTitle>
                              </DialogHeader>
                              
                              <Tabs defaultValue="details">
                                <TabsList className="w-full">
                                  <TabsTrigger value="details" className="flex-1">Détails</TabsTrigger>
                                  <TabsTrigger value="proofs" className="flex-1">
                                    Preuves ({parcel.proofs?.length || 0})
                                  </TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="details" className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm text-muted-foreground">Destinataire</p>
                                      <p className="font-medium">{parcel.recipient_name}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Statut</p>
                                      <Badge className={`${status.color} text-white`}>{status.label}</Badge>
                                    </div>
                                    {parcel.relay_point && (
                                      <div>
                                        <p className="text-sm text-muted-foreground">Point relais</p>
                                        <p className="font-medium">{parcel.relay_point.display_name}</p>
                                      </div>
                                    )}
                                    {parcel.deposited_at && (
                                      <div>
                                        <p className="text-sm text-muted-foreground">Déposé le</p>
                                        <p className="font-medium">
                                          {format(new Date(parcel.deposited_at), "dd/MM/yyyy HH:mm")}
                                        </p>
                                      </div>
                                    )}
                                    {parcel.delivered_at && (
                                      <div>
                                        <p className="text-sm text-muted-foreground">Livré le</p>
                                        <p className="font-medium">
                                          {format(new Date(parcel.delivered_at), "dd/MM/yyyy HH:mm")}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </TabsContent>
                                
                                <TabsContent value="proofs" className="space-y-4">
                                  {parcel.proofs && parcel.proofs.length > 0 ? (
                                    <>
                                      <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => exportProofs(parcel, 'json')}>
                                          <Download className="w-4 h-4 mr-2" />
                                          JSON
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => exportProofs(parcel, 'csv')}>
                                          <Download className="w-4 h-4 mr-2" />
                                          CSV
                                        </Button>
                                      </div>
                                      
                                      <div className="space-y-3">
                                        {parcel.proofs.map((proof, idx) => (
                                          <Card key={proof.id} className="border-l-4 border-l-primary">
                                            <CardContent className="p-4">
                                              <div className="flex items-start justify-between">
                                                <div>
                                                  <Badge variant="outline" className="mb-2">
                                                    {proof.proof_type === 'deposit' ? '📦 Dépôt' : 
                                                     proof.proof_type === 'pickup' ? '✅ Retrait' : proof.proof_type}
                                                  </Badge>
                                                  <p className="text-sm">
                                                    {format(new Date(proof.timestamp_utc), "dd/MM/yyyy 'à' HH:mm:ss")}
                                                  </p>
                                                  {proof.actor_name && (
                                                    <p className="text-sm text-muted-foreground">
                                                      Par: {proof.actor_name}
                                                    </p>
                                                  )}
                                                  {proof.recipient_name && (
                                                    <p className="text-sm text-muted-foreground">
                                                      Remis à: {proof.recipient_name}
                                                    </p>
                                                  )}
                                                  {proof.geo_latitude && (
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                      <MapPin className="w-3 h-3" />
                                                      {proof.geo_latitude.toFixed(6)}, {proof.geo_longitude?.toFixed(6)}
                                                    </p>
                                                  )}
                                                </div>
                                                <Badge variant="secondary" className="text-xs font-mono">
                                                  {proof.scan_method.toUpperCase()}
                                                </Badge>
                                              </div>
                                              <p className="text-xs text-muted-foreground mt-2 font-mono break-all">
                                                Hash: {proof.proof_hash}
                                              </p>
                                            </CardContent>
                                          </Card>
                                        ))}
                                      </div>
                                    </>
                                  ) : (
                                    <p className="text-center text-muted-foreground py-8">
                                      Aucune preuve enregistrée
                                    </p>
                                  )}
                                </TabsContent>
                              </Tabs>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="route" className="mt-4">
            <RouteOptimizationMap deliveryPoints={mockDeliveryPoints} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CarrierDashboard;
