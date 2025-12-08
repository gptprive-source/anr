import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAppConfig } from "@/hooks/useAppConfig";
import { toast } from "sonner";
import { Save, Euro, Clock, MapPin, Users, Mail, ArrowLeft, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Config = () => {
  const { configs, isLoading, updateConfig, isUpdating } = useAppConfig();
  const [localChanges, setLocalChanges] = useState<Record<string, any>>({});
  const navigate = useNavigate();

  const getValue = (key: string) => {
    if (key in localChanges) return localChanges[key];
    const config = configs?.find(c => c.key === key);
    if (!config) return null;
    try {
      return typeof config.value === 'string' ? JSON.parse(config.value) : config.value;
    } catch {
      return config.value;
    }
  };

  const setLocalValue = (key: string, value: any) => {
    setLocalChanges(prev => ({ ...prev, [key]: value }));
  };

  const saveConfig = async (key: string) => {
    if (!(key in localChanges)) return;
    
    try {
      await updateConfig({ key, value: localChanges[key] });
      setLocalChanges(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      toast.success('Configuration mise à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const hasChanges = (key: string) => key in localChanges;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Configuration</h1>
            <p className="text-muted-foreground">Paramètres système de l'application</p>
          </div>
        </div>

        <Tabs defaultValue="pricing" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pricing">Tarification</TabsTrigger>
            <TabsTrigger value="limits">Limites</TabsTrigger>
            <TabsTrigger value="content">Contenu</TabsTrigger>
          </TabsList>

          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="w-5 h-5" />
                  Tarification
                </CardTitle>
                <CardDescription>
                  Gérez les prix de l'abonnement et des Domings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Prix de l'abonnement annuel (€)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      value={getValue('subscription_price') || 12}
                      onChange={(e) => setLocalValue('subscription_price', Number(e.target.value))}
                      className="w-32"
                    />
                    {hasChanges('subscription_price') && (
                      <Button size="sm" onClick={() => saveConfig('subscription_price')} disabled={isUpdating}>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Prix affiché dans le FAQ: {getValue('subscription_price') || 12}€/an
                  </p>
                </div>

                <div className="space-y-4">
                  <Label>Prix unitaire d'un Doming (€)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      value={getValue('doming_price') || 7}
                      onChange={(e) => setLocalValue('doming_price', Number(e.target.value))}
                      className="w-32"
                    />
                    {hasChanges('doming_price') && (
                      <Button size="sm" onClick={() => saveConfig('doming_price')} disabled={isUpdating}>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label>Doming gratuit pour nouvelle ANR</Label>
                    <p className="text-sm text-muted-foreground">
                      Offrir un Doming gratuit lors de la création d'une nouvelle ANR
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={getValue('free_doming_for_new_anr') === true || getValue('free_doming_for_new_anr') === 'true'}
                      onCheckedChange={(checked) => {
                        setLocalValue('free_doming_for_new_anr', checked);
                        setTimeout(() => saveConfig('free_doming_for_new_anr'), 100);
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="limits" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Limites d'appel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Durée maximale d'un appel (secondes)</Label>
                  <div className="space-y-4">
                    <Slider
                      value={[getValue('max_call_duration_seconds') || 120]}
                      onValueChange={([value]) => setLocalValue('max_call_duration_seconds', value)}
                      min={60}
                      max={300}
                      step={30}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {Math.floor((getValue('max_call_duration_seconds') || 120) / 60)}:{String((getValue('max_call_duration_seconds') || 120) % 60).padStart(2, '0')}
                      </span>
                      {hasChanges('max_call_duration_seconds') && (
                        <Button size="sm" onClick={() => saveConfig('max_call_duration_seconds')} disabled={isUpdating}>
                          <Save className="w-4 h-4 mr-2" />
                          Enregistrer
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    FAQ mis à jour automatiquement avec cette valeur
                  </p>
                </div>

                <div className="space-y-4">
                  <Label>Temps minimum avant messagerie (secondes)</Label>
                  <div className="space-y-4">
                    <Slider
                      value={[getValue('min_call_duration_for_message_seconds') || 5]}
                      onValueChange={([value]) => setLocalValue('min_call_duration_for_message_seconds', value)}
                      min={3}
                      max={30}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {getValue('min_call_duration_for_message_seconds') || 5}s
                      </span>
                      {hasChanges('min_call_duration_for_message_seconds') && (
                        <Button size="sm" onClick={() => saveConfig('min_call_duration_for_message_seconds')} disabled={isUpdating}>
                          <Save className="w-4 h-4 mr-2" />
                          Enregistrer
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Durée d'appel sans réponse avant de proposer au visiteur de laisser un message
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Distance visiteur
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Distance maximale du visiteur (mètres)</Label>
                  <div className="space-y-4">
                    <Slider
                      value={[getValue('max_distance_meters') || 30]}
                      onValueChange={([value]) => setLocalValue('max_distance_meters', value)}
                      min={10}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {getValue('max_distance_meters') || 30}m
                      </span>
                      {hasChanges('max_distance_meters') && (
                        <Button size="sm" onClick={() => saveConfig('max_distance_meters')} disabled={isUpdating}>
                          <Save className="w-4 h-4 mr-2" />
                          Enregistrer
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Le visiteur doit se trouver à moins de cette distance pour appeler
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Résidents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Nombre maximum de résidents par habitation</Label>
                  <div className="space-y-4">
                    <Slider
                      value={[getValue('max_residents_per_habitation') || 7]}
                      onValueChange={([value]) => setLocalValue('max_residents_per_habitation', value)}
                      min={1}
                      max={15}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {getValue('max_residents_per_habitation') || 7} résidents
                      </span>
                      {hasChanges('max_residents_per_habitation') && (
                        <Button size="sm" onClick={() => saveConfig('max_residents_per_habitation')} disabled={isUpdating}>
                          <Save className="w-4 h-4 mr-2" />
                          Enregistrer
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Validité des invitations (heures)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      value={getValue('invitation_validity_hours') || 24}
                      onChange={(e) => setLocalValue('invitation_validity_hours', Number(e.target.value))}
                      className="w-32"
                    />
                    {hasChanges('invitation_validity_hours') && (
                      <Button size="sm" onClick={() => saveConfig('invitation_validity_hours')} disabled={isUpdating}>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Informations générales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Nom de l'application</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      value={getValue('app_name') || 'ANR'}
                      onChange={(e) => setLocalValue('app_name', e.target.value)}
                      className="w-64"
                    />
                    {hasChanges('app_name') && (
                      <Button size="sm" onClick={() => saveConfig('app_name')} disabled={isUpdating}>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Email de support</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="email"
                      value={getValue('support_email') || 'contact@soqotomobil.com'}
                      onChange={(e) => setLocalValue('support_email', e.target.value)}
                      className="w-80"
                    />
                    {hasChanges('support_email') && (
                      <Button size="sm" onClick={() => saveConfig('support_email')} disabled={isUpdating}>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      Mode IA du chatbot
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Activer le mode IA pour tous les utilisateurs (désactive la recherche FAQ)
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={getValue('chatbot_ai_mode_enabled') === true || getValue('chatbot_ai_mode_enabled') === 'true'}
                      onCheckedChange={(checked) => {
                        setLocalValue('chatbot_ai_mode_enabled', checked);
                        setTimeout(() => saveConfig('chatbot_ai_mode_enabled'), 100);
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default Config;
