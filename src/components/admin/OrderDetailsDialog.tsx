import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, User, Phone, Package, Calendar, ArrowRight, CheckCircle } from "lucide-react";
import DomingPreview from "./DomingPreview";

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

interface OrderDetailsDialogProps {
  order: Order | null;
  onClose: () => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
}

const OrderDetailsDialog = ({ order, onClose, onStatusChange }: OrderDetailsDialogProps) => {
  if (!order) return null;

  const statusLabels: Record<string, string> = {
    pending: "En attente",
    processing: "En cours de fabrication",
    shipped: "Expédiée",
    delivered: "Livrée",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-700 border-yellow-500/50",
    processing: "bg-blue-500/20 text-blue-700 border-blue-500/50",
    shipped: "bg-purple-500/20 text-purple-700 border-purple-500/50",
    delivered: "bg-green-500/20 text-green-700 border-green-500/50",
  };

  const nextStatusConfig: Record<string, { status: string; label: string; buttonClass: string }> = {
    pending: { status: "processing", label: "Traiter", buttonClass: "bg-blue-600 hover:bg-blue-700 text-white" },
    processing: { status: "shipped", label: "Expédier", buttonClass: "bg-purple-600 hover:bg-purple-700 text-white" },
    shipped: { status: "delivered", label: "Marquer livré", buttonClass: "bg-green-600 hover:bg-green-700 text-white" },
  };

  const nextStatus = nextStatusConfig[order.status] || null;

  const handleStatusChange = () => {
    if (nextStatus && onStatusChange) {
      onStatusChange(order.id, nextStatus.status);
      onClose();
    }
  };

  return (
    <Dialog open={!!order} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Commande #{order.id.slice(0, 8)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status & Actions */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <Badge className={`text-sm px-3 py-1 ${statusColors[order.status] || "bg-muted"}`}>
                {statusLabels[order.status] || order.status}
              </Badge>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {format(new Date(order.created_at), "PPP à HH:mm", { locale: fr })}
              </div>
            </div>
            
            {/* Action Button - Prominent */}
            {nextStatus && onStatusChange ? (
              <Button 
                size="lg" 
                className={`w-full ${nextStatus.buttonClass} font-semibold shadow-lg`}
                onClick={handleStatusChange}
              >
                {nextStatus.label}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3 bg-green-500/10 rounded-lg border border-green-500/30">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-700 font-medium">Traitement terminé</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Client Info */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              Informations client
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Nom</p>
                <p className="font-medium">
                  {order.profile?.first_name} {order.profile?.last_name}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Téléphone</p>
                <p className="font-medium flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {order.profile?.phone_number || "Non renseigné"}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Shipping Address */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Adresse de livraison
            </h3>
            <p className="text-sm">
              {order.shipping_address || order.anr?.address || "Non renseignée"}
            </p>
          </div>

          <Separator />

          {/* Order Details */}
          <div className="space-y-3">
            <h3 className="font-semibold">Détails de la commande</h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Code ANR</span>
                <span className="font-mono font-bold">{order.anr?.code}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Adresse ANR</span>
                <span className="text-right max-w-[200px] truncate">{order.anr?.address}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Quantité de Domings</span>
                <span className="font-medium">{order.quantity}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>
                  {order.is_free ? (
                    <Badge variant="secondary">Gratuit</Badge>
                  ) : (
                    `${(order.total_price / 100).toFixed(2)}€`
                  )}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Doming Preview & Download */}
          <div className="space-y-3">
            <h3 className="font-semibold">Fichier d'impression</h3>
            <p className="text-sm text-muted-foreground">
              Aperçu du Doming à fabriquer. Cliquez sur "Télécharger HD" pour obtenir le fichier haute définition.
            </p>
            {order.anr?.code && (
              <DomingPreview anrCode={order.anr.code} />
            )}
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsDialog;
