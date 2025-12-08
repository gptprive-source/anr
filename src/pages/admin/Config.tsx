import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useAppConfig } from "@/hooks/useAppConfig";
import { toast } from "sonner";
import { Save, Clock, MapPin, Users, Mail, ArrowLeft, Bot, Home, Building, Building2, Landmark, Check, X, Calendar, ScanFace, FileText, List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const PLANS = [
  { id: 'particulier', name: 'Particulier', icon: Home, color: 'text-blue-600' },
  { id: 'pro', name: 'Pro', icon: Building, color: 'text-orange-600' },
  { id: 'entreprise', name: 'Entreprise', icon: Building2, color: 'text-purple-600' },
  { id: 'collectivites', name: 'Collectivités', icon: Landmark, color: 'text-green-600' },
];

const PLAN_FEATURES = [
  { key: 'annual_price', label: 'Tarif mensuel', type: 'number', suffix: '€/mois', isAnnual: true },
  { key: 'doming_price', label: 'Prix Doming supplémentaire', type: 'number', suffix: '€' },
  { key: 'members_included', label: 'Membres inclus', type: 'number', suffix: '' },
  { key: 'max_extra_members', label: 'Membres supplémentaires max', type: 'number', suffix: '' },
  { key: 'extra_member_price', label: 'Tarif/Membre supplémentaire', type: 'number', suffix: '€/mois' },
  { key: 'copilot', label: 'Co-Pilot IA', type: 'boolean', icon: Bot },
  { key: 'geolocation', label: 'Géofencing avancé', type: 'boolean', icon: MapPin },
  { key: 'scheduling', label: 'Planification accès', type: 'boolean', icon: Calendar },
  { key: 'facial_recognition', label: 'Reconnaissance faciale', type: 'boolean', icon: ScanFace },
];

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

  const renderPlanCard = (planId: string, planName: string, PlanIcon: any, planColor: string) => {
    const descriptionKey = `${planId}_description`;
    const featuresKey = `${planId}_features`;
    const descriptionValue = getValue(descriptionKey) || '';
    const featuresValue = getValue(featuresKey) || [];
    const featuresText = Array.isArray(featuresValue) ? featuresValue.join('\n') : '';

    return (
      <Card key={planId} className="h-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <PlanIcon className={`w-5 h-5 ${planColor}`} />
            <span>{planName}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Description
            </Label>
            <div className="flex items-start gap-2">
              <Textarea
                value={localChanges[descriptionKey] ?? descriptionValue}
                onChange={(e) => setLocalValue(descriptionKey, e.target.value)}
                className="min-h-[60px] text-xs"
                placeholder="Description de l'offre..."
              />
              {hasChanges(descriptionKey) && (
                <Button size="icon" variant="default" onClick={() => saveConfig(descriptionKey)} disabled={isUpdating}>
                  <Save className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              <List className="w-3 h-3" />
              Avantages (1 par ligne)
            </Label>
            <div className="flex items-start gap-2">
              <Textarea
                value={localChanges[featuresKey] !== undefined 
                  ? (Array.isArray(localChanges[featuresKey]) ? localChanges[featuresKey].join('\n') : localChanges[featuresKey])
                  : featuresText}
                onChange={(e) => setLocalValue(featuresKey, e.target.value.split('\n').filter(Boolean))}
                className="min-h-[80px] text-xs"
                placeholder="Un avantage par ligne..."
              />
              {hasChanges(featuresKey) && (
                <Button size="icon" variant="default" onClick={() => saveConfig(featuresKey)} disabled={isUpdating}>
                  <Save className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Numeric fields */}
          {PLAN_FEATURES.map((feature) => {
            const configKey = `${planId}_${feature.key}`;
            const value = getValue(configKey);
            
            if (feature.type === 'boolean') {
              const isEnabled = value === true || value === 'true';
              const FeatureIcon = feature.icon;
              return (
                <div key={feature.key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    {FeatureIcon && <FeatureIcon className="w-4 h-4 text-muted-foreground" />}
                    <span className="text-sm">{feature.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => {
                        setLocalValue(configKey, checked);
                        setTimeout(() => saveConfig(configKey), 100);
                      }}
                      disabled={isUpdating}
                    />
                    {isEnabled ? (
                      <Badge variant="default" className="bg-green-600 text-xs">
                        <Check className="w-3 h-3" />
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        <X className="w-3 h-3" />
                      </Badge>
                    )}
                  </div>
                </div>
              );
            }

            // Pour les tarifs annuels, afficher en mensuel (diviser par 12)
            // Utiliser localChanges si présent, sinon value de la DB
            const rawValue = configKey in localChanges ? localChanges[configKey] : (value ?? 0);
            const displayValue = feature.isAnnual ? Math.round(rawValue / 12 * 100) / 100 : rawValue;
            const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
              const inputValue = Number(e.target.value);
              // Si c'est un tarif annuel, multiplier par 12 pour stocker
              const storeValue = feature.isAnnual ? Math.round(inputValue * 12 * 100) / 100 : inputValue;
              setLocalValue(configKey, storeValue);
            };

            return (
              <div key={feature.key} className="space-y-2">
                <Label className="text-sm text-muted-foreground">{feature.label}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step={feature.key.includes('price') ? '0.01' : '1'}
                    value={displayValue}
                    onChange={handleChange}
                    className="w-full"
                  />
                  {feature.suffix && (
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{feature.suffix}</span>
                  )}
                  {hasChanges(configKey) && (
                    <Button size="icon" variant="default" onClick={() => saveConfig(configKey)} disabled={isUpdating}>
                      <Save className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

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

        <Tabs defaultValue="plans" className="space-y-6">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="plans">Plans & Tarifs</TabsTrigger>
            <TabsTrigger value="limits">Limites</TabsTrigger>
            <TabsTrigger value="content">Contenu</TabsTrigger>
          </TabsList>

          {/* PLANS & TARIFS TAB */}
          <TabsContent value="plans" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {PLANS.map((plan) => renderPlanCard(plan.id, plan.name, plan.icon, plan.color))}
            </div>

            {/* Option Doming gratuit pour nouvelle ANR */}
            <Card>
              <CardHeader>
                <CardTitle>Options globales</CardTitle>
              </CardHeader>
              <CardContent>
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

          {/* LIMITS TAB */}
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
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[getValue('max_call_duration_seconds') || 300]}
                      onValueChange={(value) => setLocalValue('max_call_duration_seconds', value[0])}
                      min={60}
                      max={600}
                      step={30}
                      className="flex-1"
                    />
                    <span className="w-16 text-center font-mono">
                      {getValue('max_call_duration_seconds') || 300}s
                    </span>
                    {hasChanges('max_call_duration_seconds') && (
                      <Button size="sm" onClick={() => saveConfig('max_call_duration_seconds')} disabled={isUpdating}>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {Math.floor((getValue('max_call_duration_seconds') || 300) / 60)} minutes
                  </p>
                </div>

                <div className="space-y-4">
                  <Label>Temps minimum avant message visiteur (secondes)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[getValue('min_call_duration_for_message_seconds') || 30]}
                      onValueChange={(value) => setLocalValue('min_call_duration_for_message_seconds', value[0])}
                      min={3}
                      max={60}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-16 text-center font-mono">
                      {getValue('min_call_duration_for_message_seconds') || 30}s
                    </span>
                    {hasChanges('min_call_duration_for_message_seconds') && (
                      <Button size="sm" onClick={() => saveConfig('min_call_duration_for_message_seconds')} disabled={isUpdating}>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Limites GPS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Distance maximale visiteur-ANR (mètres)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[getValue('max_distance_meters') || 30]}
                      onValueChange={(value) => setLocalValue('max_distance_meters', value[0])}
                      min={10}
                      max={100}
                      step={5}
                      className="flex-1"
                    />
                    <span className="w-16 text-center font-mono">
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

                <div className="space-y-4">
                  <Label>Distance max mise à jour GPS par owner (mètres)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[getValue('max_gps_update_distance') || 200]}
                      onValueChange={(value) => setLocalValue('max_gps_update_distance', value[0])}
                      min={50}
                      max={500}
                      step={10}
                      className="flex-1"
                    />
                    <span className="w-16 text-center font-mono">
                      {getValue('max_gps_update_distance') || 200}m
                    </span>
                    {hasChanges('max_gps_update_distance') && (
                      <Button size="sm" onClick={() => saveConfig('max_gps_update_distance')} disabled={isUpdating}>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Limites résidents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Résidents max par habitation</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[getValue('max_residents_per_habitation') || 7]}
                      onValueChange={(value) => setLocalValue('max_residents_per_habitation', value[0])}
                      min={2}
                      max={15}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-16 text-center font-mono">
                      {getValue('max_residents_per_habitation') || 7}
                    </span>
                    {hasChanges('max_residents_per_habitation') && (
                      <Button size="sm" onClick={() => saveConfig('max_residents_per_habitation')} disabled={isUpdating}>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Validité d'une invitation (heures)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[getValue('invitation_validity_hours') || 24]}
                      onValueChange={(value) => setLocalValue('invitation_validity_hours', value[0])}
                      min={1}
                      max={168}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-16 text-center font-mono">
                      {getValue('invitation_validity_hours') || 24}h
                    </span>
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

          {/* CONTENT TAB */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Informations de contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Email de support</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="email"
                      value={getValue('support_email') || ''}
                      onChange={(e) => setLocalValue('support_email', e.target.value)}
                      placeholder="support@anr.fr"
                      className="flex-1"
                    />
                    {hasChanges('support_email') && (
                      <Button size="sm" onClick={() => saveConfig('support_email')} disabled={isUpdating}>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Nom de l'application</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="text"
                      value={getValue('app_name') || 'ANR'}
                      onChange={(e) => setLocalValue('app_name', e.target.value)}
                      className="flex-1"
                    />
                    {hasChanges('app_name') && (
                      <Button size="sm" onClick={() => saveConfig('app_name')} disabled={isUpdating}>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pages légales</CardTitle>
                <CardDescription>
                  Les CGU et la politique de confidentialité sont éditables depuis leurs pages dédiées
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => navigate('/admin/cgu')}>
                    Éditer les CGU
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/admin/privacy')}>
                    Éditer la Politique de Confidentialité
                  </Button>
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
