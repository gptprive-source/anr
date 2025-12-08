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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Clock, 
  Truck, 
  CheckCircle, 
  Eye, 
  Search, 
  RefreshCw, 
  ArrowLeft,
  CreditCard,
  ShoppingBag,
  Euro
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import OrderDetailsDialog from "@/components/admin/OrderDetailsDialog";

type OrderStatus = "pending" | "processing" | "shipped" | "delivered";

interface DomingOrder {
  id: string;
  type: "doming";
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

interface Subscription {
  id: string;
  type: "subscription";
  user_id: string;
  habitation_id: string;
  status: string;
  stripe_subscription_id: string | null;
  created_at: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
  } | null;
  habitation?: {
    name: string;
    anr?: {
      code: string;
      address: string;
    } | null;
  } | null;
}

type UnifiedOrder = (DomingOrder | Subscription) & { orderType: "doming" | "subscription" };

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ComponentType<any> }> = {
  pending: { label: "En attente", color: "bg-yellow-500", icon: Clock },
  processing: { label: "En cours", color: "bg-blue-500", icon: Package },
  shipped: { label: "Expédiée", color: "bg-purple-500", icon: Truck },
  delivered: { label: "Livrée", color: "bg-green-500", icon: CheckCircle },
};

const AllOrders = () => {
  const [activeTab, setActiveTab] = useState<"all" | "subscriptions" | "domings">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<DomingOrder | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch doming orders
  const { data: domingOrders, isLoading: loadingDomings, refetch: refetchDomings } = useQuery({
    queryKey: ["admin-doming-orders", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("doming_orders")
        .select(`*, anrs:anr_id (code, address)`)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all" && activeTab !== "subscriptions") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const userIds = [...new Set(data?.map(o => o.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, phone_number")
        .in("id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return (data || []).map(order => ({
        ...order,
        type: "doming" as const,
        orderType: "doming" as const,
        profile: profileMap.get(order.user_id) || null,
        anr: order.anrs
      })) as (DomingOrder & { orderType: "doming" })[];
    },
  });

  // Fetch subscriptions
  const { data: subscriptions, isLoading: loadingSubscriptions, refetch: refetchSubscriptions } = useQuery({
    queryKey: ["admin-subscriptions-unified"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          habitations:habitation_id (
            name,
            anrs:anr_id (code, address)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const userIds = [...new Set(data?.map(s => s.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, phone_number")
        .in("id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return (data || []).map(sub => ({
        ...sub,
        type: "subscription" as const,
        orderType: "subscription" as const,
        profile: profileMap.get(sub.user_id) || null,
        habitation: sub.habitations ? {
          name: sub.habitations.name,
          anr: sub.habitations.anrs
        } : null
      })) as (Subscription & { orderType: "subscription" })[];
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
      queryClient.invalidateQueries({ queryKey: ["admin-doming-orders"] });
      toast.success("Statut mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const refetchAll = () => {
    refetchDomings();
    refetchSubscriptions();
  };

  // Combine and filter orders
  const allOrders: UnifiedOrder[] = [
    ...(subscriptions || []),
    ...(domingOrders || [])
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filteredOrders = allOrders.filter((order) => {
    // Tab filter
    if (activeTab === "subscriptions" && order.orderType !== "subscription") return false;
    if (activeTab === "domings" && order.orderType !== "doming") return false;

    // Status filter (only for domings)
    if (statusFilter !== "all" && order.orderType === "doming" && (order as DomingOrder).status !== statusFilter) {
      return false;
    }

    // Search filter
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    
    if (order.orderType === "doming") {
      const doming = order as DomingOrder;
      return (
        doming.profile?.first_name?.toLowerCase().includes(search) ||
        doming.profile?.last_name?.toLowerCase().includes(search) ||
        doming.anr?.code?.toLowerCase().includes(search) ||
        doming.anr?.address?.toLowerCase().includes(search)
      );
    } else {
      const sub = order as Subscription;
      return (
        sub.profile?.first_name?.toLowerCase().includes(search) ||
        sub.profile?.last_name?.toLowerCase().includes(search) ||
        sub.habitation?.anr?.code?.toLowerCase().includes(search) ||
        sub.habitation?.anr?.address?.toLowerCase().includes(search)
      );
    }
  });

  const stats = {
    totalSubscriptions: subscriptions?.length || 0,
    totalDomings: domingOrders?.length || 0,
    subscriptionRevenue: (subscriptions?.length || 0) * 12, // 12€ per subscription
    domingRevenue: domingOrders?.reduce((sum, o) => sum + (o.is_free ? 0 : o.total_price / 100), 0) || 0,
    pendingDomings: domingOrders?.filter((o) => o.status === "pending").length || 0,
  };

  const isLoading = loadingDomings || loadingSubscriptions;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Toutes les commandes</h1>
              <p className="text-muted-foreground">Vue unifiée des abonnements et commandes de Domings</p>
            </div>
          </div>
          <Button variant="outline" onClick={refetchAll}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary">
                <CreditCard className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalSubscriptions}</p>
                <p className="text-sm text-muted-foreground">Abonnements</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-secondary">
                <ShoppingBag className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalDomings}</p>
                <p className="text-sm text-muted-foreground">Domings</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500">
                <Euro className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.subscriptionRevenue}€</p>
                <p className="text-sm text-muted-foreground">Rev. Abo</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500">
                <Euro className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.domingRevenue.toFixed(0)}€</p>
                <p className="text-sm text-muted-foreground">Rev. Domings</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:bg-muted/50" onClick={() => { setActiveTab("domings"); setStatusFilter("pending"); }}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-500">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingDomings}</p>
                <p className="text-sm text-muted-foreground">En attente</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "subscriptions" | "domings")}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="all">Tout ({allOrders.length})</TabsTrigger>
            <TabsTrigger value="subscriptions">Abonnements ({subscriptions?.length || 0})</TabsTrigger>
            <TabsTrigger value="domings">Domings ({domingOrders?.length || 0})</TabsTrigger>
          </TabsList>
        </Tabs>

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
            {activeTab !== "subscriptions" && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Statut Doming" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="processing">En cours</SelectItem>
                  <SelectItem value="shipped">Expédiée</SelectItem>
                  <SelectItem value="delivered">Livrée</SelectItem>
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Aucune commande trouvée
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Code ANR</TableHead>
                    <TableHead>Détails</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    if (order.orderType === "subscription") {
                      const sub = order as Subscription & { orderType: "subscription" };
                      return (
                        <TableRow key={`sub-${sub.id}`}>
                          <TableCell>
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                              <CreditCard className="w-3 h-3 mr-1" />
                              Abo
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(sub.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {sub.profile?.first_name} {sub.profile?.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">{sub.profile?.phone_number}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-mono font-medium">{sub.habitation?.anr?.code || "-"}</p>
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {sub.habitation?.anr?.address || sub.habitation?.name}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">Abonnement annuel</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-green-600">12,00€</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={sub.status === "active" ? "bg-green-500" : "bg-gray-500"}>
                              {sub.status === "active" ? "Actif" : sub.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" disabled>
                              <Eye className="w-4 h-4 mr-1" />
                              Stripe
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    } else {
                      const doming = order as DomingOrder & { orderType: "doming" };
                      const status = doming.status as OrderStatus;
                      const config = statusConfig[status] || statusConfig.pending;
                      const Icon = config.icon;
                      
                      return (
                        <TableRow key={`dom-${doming.id}`}>
                          <TableCell>
                            <Badge variant="outline" className="bg-secondary/50 text-secondary-foreground border-secondary/20">
                              <Package className="w-3 h-3 mr-1" />
                              Doming
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(doming.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {doming.profile?.first_name} {doming.profile?.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">{doming.profile?.phone_number}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-mono font-medium">{doming.anr?.code}</p>
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {doming.anr?.address}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{doming.quantity} Doming(s)</span>
                          </TableCell>
                          <TableCell>
                            {doming.is_free ? (
                              <Badge variant="secondary">Gratuit</Badge>
                            ) : (
                              <span className="font-semibold">{(doming.total_price / 100).toFixed(2)}€</span>
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
                                onClick={() => setSelectedOrder(doming)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Détails
                              </Button>
                              {status === "pending" && (
                                <Button
                                  size="sm"
                                  onClick={() => updateStatusMutation.mutate({ orderId: doming.id, newStatus: "processing" })}
                                >
                                  Traiter
                                </Button>
                              )}
                              {status === "processing" && (
                                <Button
                                  size="sm"
                                  onClick={() => updateStatusMutation.mutate({ orderId: doming.id, newStatus: "shipped" })}
                                >
                                  Expédier
                                </Button>
                              )}
                              {status === "shipped" && (
                                <Button
                                  size="sm"
                                  onClick={() => updateStatusMutation.mutate({ orderId: doming.id, newStatus: "delivered" })}
                                >
                                  Livré
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }
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
          onStatusChange={(orderId, newStatus) => updateStatusMutation.mutate({ orderId, newStatus })}
        />
      </div>
    </AdminLayout>
  );
};

export default AllOrders;