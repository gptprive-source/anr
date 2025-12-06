import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Search, Settings2, RotateCcw, ArrowLeft } from "lucide-react";
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

const DEFAULT_GPS_DISTANCE = 200;

const AdminANRs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingAnr, setEditingAnr] = useState<any | null>(null);
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

  const handleSave = () => {
    if (!editingAnr) return;
    updateAnrMutation.mutate({
      id: editingAnr.id,
      max_gps_update_distance: useDefault ? null : customDistance,
    });
  };

  // Filter ANRs by search query
  const filteredAnrs = anrs?.filter(
    (anr) =>
      anr.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      anr.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            Configurez la distance GPS maximale pour chaque ANR
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Distance par défaut : {DEFAULT_GPS_DISTANCE}m</strong>
            <br />
            Pour les grands ensembles (HLM, zones industrielles), vous pouvez augmenter cette limite individuellement.
            Les résidents dépassant la limite verront un message les invitant à contacter <strong>{supportEmail}</strong>.
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
                <TableHead>GPS</TableHead>
                <TableHead>Distance max</TableHead>
                <TableHead className="w-20">Actions</TableHead>
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
                    <TableCell className="text-xs text-muted-foreground">
                      {anr.latitude.toFixed(4)}, {anr.longitude.toFixed(4)}
                    </TableCell>
                    <TableCell>
                      {anr.max_gps_update_distance === null ? (
                        <Badge variant="secondary">
                          {DEFAULT_GPS_DISTANCE}m (défaut)
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                          <Settings2 className="w-3 h-3 mr-1" />
                          {anr.max_gps_update_distance}m
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(anr)}
                      >
                        <Settings2 className="w-4 h-4" />
                      </Button>
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
      </div>
    </AdminLayout>
  );
};

export default AdminANRs;
