import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Search, Settings2, RotateCcw, ArrowLeft, Nfc, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAppConfig } from "@/hooks/useAppConfig";
import AdminLayout from "./AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DEFAULT_GPS_DISTANCE = 200;

const AdminANRs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingAnr, setEditingAnr] = useState<any | null>(null);
  const [editingNfc, setEditingNfc] = useState<any | null>(null);
  const [nfcSerial, setNfcSerial] = useState("");
  const [customDistance, setCustomDistance] = useState(DEFAULT_GPS_DISTANCE);
  const [useDefault, setUseDefault] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getConfig } = useAppConfig();
  const supportEmail = getConfig("support_email") || "support@anr.fr";
  const navigate = useNavigate();

  // Fetch all ANRs
  const { data: anrs, isLoading } = useQuery({
    queryKey: ["admin-anrs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anrs")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Update ANR mutation
  const updateAnrMutation = useMutation({
    mutationFn: async ({ id, max_gps_update_distance }: { id: string; max_gps_update_distance: number | null }) => {
      const { error } = await supabase
        .from("anrs")
        .update({ max_gps_update_distance })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-anrs"] });
      await queryClient.refetchQueries({ queryKey: ["admin-anrs"] });
      toast({
        title: "✅ ANR mise à jour",
        description: "La distance GPS maximale a été modifiée.",
      });
      setEditingAnr(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    },
  });

  // Update NFC serial mutation
  const updateNfcMutation = useMutation({
    mutationFn: async ({ id, nfc_serial }: { id: string; nfc_serial: string | null }) => {
      const { error } = await supabase
        .from("anrs")
        .update({ nfc_serial })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-anrs"] });
      await queryClient.refetchQueries({ queryKey: ["admin-anrs"] });
      toast({
        title: "✅ NFC mis à jour",
        description: "Le serial NFC a été enregistré.",
      });
      setEditingNfc(null);
      setNfcSerial("");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    },
  });

  const handleOpenEdit = (anr: any) => {
    setEditingAnr(anr);
    if (anr.max_gps_update_distance === null) {
      setUseDefault(true);
      setCustomDistance(DEFAULT_GPS_DISTANCE);
    } else {
      setUseDefault(false);
      setCustomDistance(anr.max_gps_update_distance);
    }
  };

  const handleOpenNfcEdit = (anr: any) => {
    setEditingNfc(anr);
    setNfcSerial(anr.nfc_serial || "");
  };

  const handleSave = () => {
    if (!editingAnr) return;
    updateAnrMutation.mutate({
      id: editingAnr.id,
      max_gps_update_distance: useDefault ? null : customDistance,
    });
  };

  const handleSaveNfc = () => {
    if (!editingNfc) return;
    updateNfcMutation.mutate({
      id: editingNfc.id,
      nfc_serial: nfcSerial.trim() || null,
    });
  };

  // Filter ANRs by search query
  const filteredAnrs = anrs?.filter(
    (anr) =>
      anr.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      anr.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (anr.nfc_serial && anr.nfc_serial.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Count ANRs with NFC
  const anrsWithNfc = anrs?.filter(anr => anr.nfc_serial).length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <MapPin className="w-6 h-6 text-primary" />
            Gestion des ANRs
          </h1>
          <p className="text-muted-foreground">
            Configurez la distance GPS et les serials NFC des ANRs
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-2xl font-bold">{anrs?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Total ANRs</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-2xl font-bold text-green-500">{anrsWithNfc}</p>
            <p className="text-sm text-muted-foreground">Avec NFC</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-2xl font-bold text-orange-500">{(anrs?.length || 0) - anrsWithNfc}</p>
            <p className="text-sm text-muted-foreground">Sans NFC</p>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Configuration NFC pour livraisons offline</strong>
            <br />
            Le serial NFC permet de vérifier la présence physique du livreur à l'adresse lors des livraisons offline.
            Format typique: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">04:A1:B2:C3:D4:E5:F6</code>
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par code ou adresse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code ANR</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>NFC Serial</TableHead>
                <TableHead>Distance max</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                      Chargement...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredAnrs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucune ANR trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filteredAnrs?.map((anr) => (
                  <TableRow key={anr.id}>
                    <TableCell className="font-mono font-medium">{anr.code}</TableCell>
                    <TableCell className="max-w-xs truncate" title={anr.address}>
                      {anr.address}
                    </TableCell>
                    <TableCell>
                      {anr.nfc_serial ? (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600 font-mono text-xs">
                          <Nfc className="w-3 h-3 mr-1" />
                          {anr.nfc_serial.substring(0, 14)}...
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Non configuré
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {anr.max_gps_update_distance === null ? (
                        <Badge variant="secondary">
                          {DEFAULT_GPS_DISTANCE}m
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                          {anr.max_gps_update_distance}m
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenNfcEdit(anr)}
                          title="Configurer NFC"
                        >
                          <Nfc className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(anr)}
                          title="Configurer GPS"
                        >
                          <Settings2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingAnr} onOpenChange={(open) => !open && setEditingAnr(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Modifier la distance GPS
              </DialogTitle>
              <DialogDescription>
                Configurez la distance maximale autorisée pour la mise à jour GPS de cette ANR.
              </DialogDescription>
            </DialogHeader>

            {editingAnr && (
              <div className="space-y-6 py-4">
                {/* ANR Info */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">ANR</Label>
                  <p className="font-mono font-medium">{editingAnr.code}</p>
                  <p className="text-sm text-muted-foreground">{editingAnr.address}</p>
                </div>

                {/* Use Default Checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="use-default"
                    checked={useDefault}
                    onCheckedChange={(checked) => setUseDefault(!!checked)}
                  />
                  <Label htmlFor="use-default" className="cursor-pointer">
                    Utiliser la valeur par défaut ({DEFAULT_GPS_DISTANCE}m)
                  </Label>
                </div>

                {/* Custom Distance Slider */}
                {!useDefault && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Distance maximale</Label>
                      <span className="font-bold text-primary">{customDistance}m</span>
                    </div>
                    <Slider
                      value={[customDistance]}
                      onValueChange={([value]) => setCustomDistance(value)}
                      min={50}
                      max={2000}
                      step={50}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>50m</span>
                      <span>2000m</span>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      💡 Pour les grands ensembles (HLM, zones industrielles), une distance de 500m à 1000m est recommandée.
                    </p>
                  </div>
                )}

                {/* Reset button when custom value is set */}
                {!useDefault && editingAnr.max_gps_update_distance !== null && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUseDefault(true);
                      setCustomDistance(DEFAULT_GPS_DISTANCE);
                    }}
                    className="w-full"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Réinitialiser à la valeur par défaut
                  </Button>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingAnr(null)}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={updateAnrMutation.isPending}>
                {updateAnrMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* NFC Serial Edit Dialog */}
        <Dialog open={!!editingNfc} onOpenChange={(open) => !open && setEditingNfc(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Nfc className="w-5 h-5 text-primary" />
                Configurer le serial NFC
              </DialogTitle>
              <DialogDescription>
                Enregistrez le numéro de série du tag NFC pour cette ANR (utilisé pour la vérification de présence lors des livraisons).
              </DialogDescription>
            </DialogHeader>

            {editingNfc && (
              <div className="space-y-6 py-4">
                {/* ANR Info */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">ANR</Label>
                  <p className="font-mono font-medium">{editingNfc.code}</p>
                  <p className="text-sm text-muted-foreground">{editingNfc.address}</p>
                </div>

                {/* NFC Serial Input */}
                <div className="space-y-2">
                  <Label htmlFor="nfc-serial">Numéro de série NFC</Label>
                  <Input
                    id="nfc-serial"
                    placeholder="04:A1:B2:C3:D4:E5:F6"
                    value={nfcSerial}
                    onChange={(e) => setNfcSerial(e.target.value.toUpperCase())}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Le serial NFC se trouve sur le tag ou peut être lu avec une app NFC.
                    Laissez vide pour supprimer le serial.
                  </p>
                </div>

                {/* Current value indicator */}
                {editingNfc.nfc_serial && (
                  <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      <strong>Serial actuel:</strong>{" "}
                      <code className="font-mono">{editingNfc.nfc_serial}</code>
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingNfc(null)}>
                Annuler
              </Button>
              <Button onClick={handleSaveNfc} disabled={updateNfcMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {updateNfcMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminANRs;
