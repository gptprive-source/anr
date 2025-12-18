import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Search, Plus, Truck, ArrowLeft, Trash2, Eye, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "./AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const statusLabels: Record<string, { label: string; color: string }> = {
  created: { label: "Créé", color: "bg-gray-500" },
  in_transit: { label: "En transit", color: "bg-blue-500" },
  deposited_at_relay: { label: "Au relais", color: "bg-orange-500" },
  available_for_pickup: { label: "Disponible", color: "bg-yellow-500" },
  delivered: { label: "Livré", color: "bg-green-500" },
  returned: { label: "Retourné", color: "bg-red-500" },
};

const AdminParcels = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteParcelId, setDeleteParcelId] = useState<string | null>(null);
  const [viewParcel, setViewParcel] = useState<any | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    tracking_number: "",
    recipient_name: "",
    recipient_phone: "",
    recipient_email: "",
    recipient_anr_code: "",
    carrier_id: "",
    description: "",
  });

  // Fetch parcels
  const { data: parcels, isLoading } = useQuery({
    queryKey: ["admin-parcels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcels")
        .select(`
          *,
          recipient_anr:anrs!parcels_recipient_anr_id_fkey(code, address),
          carrier:carriers!parcels_carrier_id_fkey(company_name)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch carriers for dropdown
  const { data: carriers } = useQuery({
    queryKey: ["admin-carriers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carriers")
        .select("id, company_name")
        .eq("is_active", true);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch ANRs for dropdown
  const { data: anrs } = useQuery({
    queryKey: ["admin-anrs-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anrs")
        .select("id, code, address")
        .order("code");
      
      if (error) throw error;
      return data;
    },
  });

  // Create parcel mutation
  const createParcelMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Find ANR by code
      const anr = anrs?.find(a => a.code === data.recipient_anr_code);
      
      const { error } = await supabase
        .from("parcels")
        .insert({
          tracking_number: data.tracking_number || `ANR-${Date.now()}`,
          recipient_name: data.recipient_name,
          recipient_phone: data.recipient_phone || null,
          recipient_email: data.recipient_email || null,
          recipient_anr_id: anr?.id || null,
          carrier_id: data.carrier_id || null,
          description: data.description || null,
          status: "created",
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-parcels"] });
      toast({ title: "✅ Colis créé", description: "Le colis a été ajouté avec succès." });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    },
  });

  // Delete parcel mutation
  const deleteParcelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("parcels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-parcels"] });
      toast({ title: "🗑️ Colis supprimé" });
      setDeleteParcelId(null);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    },
  });

  // Update parcel status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("parcels").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-parcels"] });
      toast({ title: "✅ Statut mis à jour" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    },
  });

  const resetForm = () => {
    setFormData({
      tracking_number: "",
      recipient_name: "",
      recipient_phone: "",
      recipient_email: "",
      recipient_anr_code: "",
      carrier_id: "",
      description: "",
    });
  };

  // Filter parcels
  const filteredParcels = parcels?.filter((p) => {
    const matchesSearch = 
      p.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.recipient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.recipient_anr?.code?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Package className="w-6 h-6 text-primary" />
              Gestion des Colis
            </h1>
            <p className="text-muted-foreground">
              Créez et gérez les colis pour le système de livraison offline
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau colis
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-2xl font-bold">{parcels?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-2xl font-bold text-blue-500">
              {parcels?.filter(p => p.status === "in_transit").length || 0}
            </p>
            <p className="text-sm text-muted-foreground">En transit</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-2xl font-bold text-orange-500">
              {parcels?.filter(p => p.status === "created").length || 0}
            </p>
            <p className="text-sm text-muted-foreground">À livrer</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-2xl font-bold text-green-500">
              {parcels?.filter(p => p.status === "delivered").length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Livrés</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par n° tracking, destinataire ou ANR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48">
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

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Tracking</TableHead>
                <TableHead>Destinataire</TableHead>
                <TableHead>ANR</TableHead>
                <TableHead>Transporteur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                      Chargement...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredParcels?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucun colis trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredParcels?.map((parcel) => {
                  const status = statusLabels[parcel.status] || statusLabels.created;
                  return (
                    <TableRow key={parcel.id}>
                      <TableCell className="font-mono font-medium">
                        {parcel.tracking_number}
                      </TableCell>
                      <TableCell>{parcel.recipient_name || "-"}</TableCell>
                      <TableCell>
                        {parcel.recipient_anr ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-primary" />
                            <span className="font-mono text-xs">{parcel.recipient_anr.code}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {parcel.carrier?.company_name || "-"}
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={parcel.status} 
                          onValueChange={(value) => updateStatusMutation.mutate({ id: parcel.id, status: value })}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <Badge className={`${status.color} text-white`}>
                              {status.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels).map(([key, { label }]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(parcel.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewParcel(parcel)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteParcelId(parcel.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Create Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Nouveau colis
              </DialogTitle>
              <DialogDescription>
                Créez un nouveau colis pour le système de livraison offline
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>N° Tracking (optionnel)</Label>
                <Input
                  placeholder="ANR-XXXXX (auto-généré si vide)"
                  value={formData.tracking_number}
                  onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Nom du destinataire *</Label>
                <Input
                  placeholder="Jean Dupont"
                  value={formData.recipient_name}
                  onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Code ANR de destination *</Label>
                <Select
                  value={formData.recipient_anr_code}
                  onValueChange={(value) => setFormData({ ...formData, recipient_anr_code: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une ANR" />
                  </SelectTrigger>
                  <SelectContent>
                    {anrs?.map((anr) => (
                      <SelectItem key={anr.id} value={anr.code}>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          <span className="font-mono">{anr.code}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {anr.address}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    placeholder="06 XX XX XX XX"
                    value={formData.recipient_phone}
                    onChange={(e) => setFormData({ ...formData, recipient_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    placeholder="email@exemple.com"
                    value={formData.recipient_email}
                    onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Transporteur</Label>
                <Select
                  value={formData.carrier_id}
                  onValueChange={(value) => setFormData({ ...formData, carrier_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un transporteur" />
                  </SelectTrigger>
                  <SelectContent>
                    {carriers?.map((carrier) => (
                      <SelectItem key={carrier.id} value={carrier.id}>
                        <div className="flex items-center gap-2">
                          <Truck className="w-3 h-3" />
                          {carrier.company_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Colis fragile, électronique..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                onClick={() => createParcelMutation.mutate(formData)}
                disabled={!formData.recipient_name || !formData.recipient_anr_code || createParcelMutation.isPending}
              >
                {createParcelMutation.isPending ? "Création..." : "Créer le colis"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={!!viewParcel} onOpenChange={(open) => !open && setViewParcel(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Détails du colis</DialogTitle>
            </DialogHeader>
            {viewParcel && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">N° Tracking</Label>
                    <p className="font-mono font-medium">{viewParcel.tracking_number}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Statut</Label>
                    <Badge className={`${statusLabels[viewParcel.status]?.color} text-white`}>
                      {statusLabels[viewParcel.status]?.label}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Destinataire</Label>
                    <p>{viewParcel.recipient_name || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">ANR</Label>
                    <p className="font-mono">{viewParcel.recipient_anr?.code || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Téléphone</Label>
                    <p>{viewParcel.recipient_phone || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p>{viewParcel.recipient_email || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Adresse ANR</Label>
                    <p>{viewParcel.recipient_anr?.address || "-"}</p>
                  </div>
                  {viewParcel.description && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Description</Label>
                      <p>{viewParcel.description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteParcelId} onOpenChange={(open) => !open && setDeleteParcelId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce colis ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Le colis sera définitivement supprimé.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground"
                onClick={() => deleteParcelId && deleteParcelMutation.mutate(deleteParcelId)}
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminParcels;
