import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Loader2, Receipt, Calendar, CreditCard, Truck, CheckCircle, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface DomingOrder {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  is_free: boolean;
  shipping_address: string | null;
  created_at: string;
  anr?: {
    code: string;
    address: string;
  };
}

interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  created_at: string;
  current_period_start: string;
  current_period_end: string;
  stripe_subscription_id: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  paid: { label: "Payée", color: "bg-blue-500", icon: <CreditCard className="w-3 h-3" /> },
  processing: { label: "En cours", color: "bg-yellow-500", icon: <Clock className="w-3 h-3" /> },
  shipped: { label: "Expédiée", color: "bg-purple-500", icon: <Truck className="w-3 h-3" /> },
  delivered: { label: "Livrée", color: "bg-green-500", icon: <CheckCircle className="w-3 h-3" /> },
  pending: { label: "En attente", color: "bg-orange-500", icon: <Clock className="w-3 h-3" /> },
  active: { label: "Actif", color: "bg-green-500", icon: <CheckCircle className="w-3 h-3" /> },
  canceled: { label: "Annulé", color: "bg-red-500", icon: <Clock className="w-3 h-3" /> },
};

const Orders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [domingOrders, setDomingOrders] = useState<DomingOrder[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      // Fetch doming orders
      const { data: domings, error: domingsError } = await supabase
        .from("doming_orders")
        .select(`
          id,
          quantity,
          unit_price,
          total_price,
          status,
          is_free,
          shipping_address,
          created_at,
          anrs (
            code,
            address
          )
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (domingsError) throw domingsError;

      // Fetch subscriptions
      const { data: subs, error: subsError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (subsError) throw subsError;

      setDomingOrders(domings?.map(d => ({
        ...d,
        anr: d.anrs as any
      })) || []);
      setSubscriptions(subs || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { label: status, color: "bg-gray-500", icon: null };
    return (
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d MMMM yyyy", { locale: fr });
  };

  const getPlanLabel = (planType: string) => {
    const labels: Record<string, string> = {
      particulier: "Particulier",
      pro: "Professionnel",
      entreprise: "Entreprise",
      collectivites: "Collectivités"
    };
    return labels[planType] || planType;
  };

  const viewInvoice = async (orderId: string, orderType: 'doming' | 'subscription') => {
    try {
      const { data, error } = await supabase.functions.invoke('send-invoice', {
        body: { 
          orderId, 
          orderType,
          viewOnly: true 
        }
      });

      if (error) throw error;

      if (data?.invoiceHtml) {
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(data.invoiceHtml);
          newWindow.document.close();
        }
      }
    } catch (error) {
      console.error("Error viewing invoice:", error);
      toast.error("Erreur lors de l'affichage de la facture");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Mes Commandes</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Subscriptions Section */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-green-500" />
            </div>
            Abonnements
          </h2>

          {subscriptions.length === 0 ? (
            <Card className="border-green-500">
              <CardContent className="p-4 text-center text-muted-foreground">
                Aucun abonnement
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) => (
                <Card key={sub.id} className="border-green-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold">{getPlanLabel(sub.plan_type)}</p>
                        <p className="text-sm text-muted-foreground">
                          Abonnement annuel
                        </p>
                      </div>
                      {getStatusBadge(sub.status)}
                    </div>
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Depuis le {formatDate(sub.current_period_start)}
                          {sub.current_period_end && ` · Expire le ${formatDate(sub.current_period_end)}`}
                        </span>
                      </div>
                    </div>
                    <Separator className="my-2" />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-green-500 text-green-600 hover:bg-green-50"
                      onClick={() => viewInvoice(sub.id, 'subscription')}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Voir la facture
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Doming Orders Section */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-purple-500" />
            </div>
            Commandes de Domings
          </h2>

          {domingOrders.length === 0 ? (
            <Card className="border-purple-500">
              <CardContent className="p-4 text-center text-muted-foreground">
                Aucune commande de Doming
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {domingOrders.map((order) => (
                <Card key={order.id} className="border-purple-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold">
                          {order.quantity}x Doming{order.quantity > 1 ? "s" : ""}
                          {order.is_free && " (Gratuit)"}
                        </p>
                        {order.anr && (
                          <p className="text-sm text-muted-foreground font-mono">
                            ANR: {order.anr.code}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                    
                    <Separator className="my-2" />
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Prix unitaire</span>
                        <span>{order.is_free ? "0,00" : order.unit_price.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span className="text-primary">{order.total_price.toFixed(2)}€</span>
                      </div>
                    </div>

                    {order.shipping_address && (
                      <>
                        <Separator className="my-2" />
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Truck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{order.shipping_address}</span>
                        </div>
                      </>
                    )}

                    <Separator className="my-2" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(order.created_at)}</span>
                      </div>
                    </div>
                    <Separator className="my-2" />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-purple-500 text-purple-600 hover:bg-purple-50"
                      onClick={() => viewInvoice(order.id, 'doming')}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Voir la facture
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Shop CTA */}
        <Card className="border-pink-500 bg-gradient-to-r from-pink-500/5 to-purple-500/5">
          <CardContent className="p-4 text-center">
            <p className="text-muted-foreground mb-3">
              Besoin de Domings supplémentaires ?
            </p>
            <Button onClick={() => navigate("/shop")} className="bg-pink-500 hover:bg-pink-600">
              <Package className="w-4 h-4 mr-2" />
              Accéder à la boutique
            </Button>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Orders;
