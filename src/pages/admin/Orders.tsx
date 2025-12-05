import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Clock, Truck, CheckCircle, Eye, Search, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import OrderDetailsDialog from "@/components/admin/OrderDetailsDialog";

type OrderStatus = "pending" | "processing" | "shipped" | "delivered";

interface Order {
  id: string;
  user_id: string;
  anr_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_free: boolean;
  status: string;
  shipping_address: string | null;
  created_at: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
  } | null;
  anr?: {
    code: string;
    address: string;
  } | null;
}

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ComponentType<any> }> = {
  pending: { label: "En attente", color: "bg-yellow-500", icon: Clock },
  processing: { label: "En cours", color: "bg-blue-500", icon: Package },
  shipped: { label: "Expédiée", color: "bg-purple-500", icon: Truck },
  delivered: { label: "Livrée", color: "bg-green-500", icon: CheckCircle },
};

const Orders = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const queryClient = useQueryClient();

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ["admin-orders", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("doming_orders")
        .select(`
          *,
          anrs:anr_id (code, address)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = [...new Set(data?.map(o => o.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, phone_number")
        .in("id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return (data || []).map(order => ({
        ...order,
        profile: profileMap.get(order.user_id) || null,
        anr: order.anrs
      })) as Order[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("doming_orders")
        .update({ status: newStatus })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Statut mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const filteredOrders = orders?.filter((order) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      order.profile?.first_name?.toLowerCase().includes(search) ||
      order.profile?.last_name?.toLowerCase().includes(search) ||
      order.anr?.code?.toLowerCase().includes(search) ||
      order.anr?.address?.toLowerCase().includes(search)
    );
  });

  const stats = {
    pending: orders?.filter((o) => o.status === "pending").length || 0,
    processing: orders?.filter((o) => o.status === "processing").length || 0,
    shipped: orders?.filter((o) => o.status === "shipped").length || 0,
    delivered: orders?.filter((o) => o.status === "delivered").length || 0,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Commandes de Domings</h1>
            <p className="text-muted-foreground">Gérer les commandes et générer les fichiers d'impression</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(Object.entries(statusConfig) as [OrderStatus, typeof statusConfig[OrderStatus]][]).map(([status, config]) => {
            const Icon = config.icon;
            return (
              <Card key={status} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setStatusFilter(status)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-full ${config.color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats[status]}</p>
                    <p className="text-sm text-muted-foreground">{config.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtres</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, code ANR, adresse..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="processing">En cours</SelectItem>
                <SelectItem value="shipped">Expédiée</SelectItem>
                <SelectItem value="delivered">Livrée</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredOrders?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Aucune commande trouvée
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Code ANR</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders?.map((order) => {
                    const status = order.status as OrderStatus;
                    const config = statusConfig[status] || statusConfig.pending;
                    const Icon = config.icon;
                    
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {order.profile?.first_name} {order.profile?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{order.profile?.phone_number}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-mono font-medium">{order.anr?.code}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {order.anr?.address}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell>
                          {order.is_free ? (
                            <Badge variant="secondary">Gratuit</Badge>
                          ) : (
                            <span>{(order.total_price / 100).toFixed(2)}€</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${config.color} text-white`}>
                            <Icon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Détails
                            </Button>
                            {status === "pending" && (
                              <Button
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: "processing" })}
                              >
                                Traiter
                              </Button>
                            )}
                            {status === "processing" && (
                              <Button
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: "shipped" })}
                              >
                                Expédier
                              </Button>
                            )}
                            {status === "shipped" && (
                              <Button
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: "delivered" })}
                              >
                                Livré
                              </Button>
                            )}
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

        {/* Order Details Dialog */}
        <OrderDetailsDialog
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      </div>
    </AdminLayout>
  );
};

export default Orders;
