import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Smartphone, Monitor, Tablet, Trash2, QrCode, Crown } from "lucide-react";
import { toast } from "sonner";
import DeviceAuthScanner from "./DeviceAuthScanner";
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

interface Device {
  id: string;
  device_id: string;
  device_name: string | null;
  is_primary: boolean;
  verified_at: string;
  last_used_at: string;
}

const ConnectedDevices = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [deleting, setDeleting] = useState(false);

  const currentDeviceId = localStorage.getItem("anr_device_id");

  const fetchDevices = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("user_devices")
      .select("*")
      .eq("user_id", user.id)
      .order("is_primary", { ascending: false })
      .order("last_used_at", { ascending: false });

    if (error) {
      console.error("[ConnectedDevices] Error fetching:", error);
      return;
    }

    setDevices(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDevices();
  }, [user]);

  const getDeviceIcon = (name: string | null) => {
    if (!name) return Monitor;
    const lowerName = name.toLowerCase();
    if (lowerName.includes("iphone") || lowerName.includes("android") || lowerName.includes("phone")) {
      return Smartphone;
    }
    if (lowerName.includes("ipad") || lowerName.includes("tablet")) {
      return Tablet;
    }
    return Monitor;
  };

  const handleDelete = async () => {
    if (!deviceToDelete) return;

    setDeleting(true);

    try {
      const { error } = await supabase
        .from("user_devices")
        .delete()
        .eq("id", deviceToDelete.id);

      if (error) throw error;

      toast.success("Appareil supprimé");
      setDevices(devices.filter((d) => d.id !== deviceToDelete.id));
    } catch (error) {
      console.error("[ConnectedDevices] Error deleting:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleting(false);
      setDeviceToDelete(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Appareils connectés
          </CardTitle>
          <CardDescription>
            Gérez les appareils autorisés à accéder à votre compte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {devices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun appareil enregistré
            </p>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => {
                const Icon = getDeviceIcon(device.device_name);
                const isCurrentDevice = device.device_id === currentDeviceId;

                return (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {device.device_name || "Appareil inconnu"}
                          </span>
                          {device.is_primary && (
                            <Badge variant="secondary" className="text-xs">
                              <Crown className="w-3 h-3 mr-1" />
                              Principal
                            </Badge>
                          )}
                          {isCurrentDevice && (
                            <Badge variant="outline" className="text-xs">
                              Cet appareil
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Dernière activité : {formatDate(device.last_used_at)}
                        </p>
                      </div>
                    </div>

                    {!isCurrentDevice && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeviceToDelete(device)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setScannerOpen(true)}
          >
            <QrCode className="w-4 h-4 mr-2" />
            Autoriser un nouvel appareil
          </Button>
        </CardContent>
      </Card>

      <DeviceAuthScanner open={scannerOpen} onOpenChange={setScannerOpen} />

      <AlertDialog open={!!deviceToDelete} onOpenChange={() => setDeviceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet appareil ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'appareil "{deviceToDelete?.device_name}" ne pourra plus accéder à votre compte.
              Il devra être ré-autorisé pour se reconnecter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ConnectedDevices;
