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
import { Save, Clock, MapPin, Users, Mail, ArrowLeft, Bot, Home, Building, Building2, Landmark, Check, X, Calendar, ScanFace, FileText, List, ToggleLeft, Video, Phone, MessageSquare, Mic, DoorOpen, Key, CreditCard, RefreshCw, Package, Truck, Gift, PackageCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const PLANS = [
  { id: 'particulier', name: 'Particulier', icon: Home, color: 'text-blue-600' },
  { id: 'pro', name: 'Pro', icon: Building, color: 'text-orange-600' },
  { id: 'entreprise', name: 'Entreprise', icon: Building2, color: 'text-purple-600' },
  { id: 'collectivites', name: 'Collectivités', icon: Landmark, color: 'text-green-600' },
];

const PLAN_FEATURES = [
  { key: 'annual_price', label: 'Tarif mensuel', type: 'number', suffix: '€/mois', isAnnual: true, syncStripe: true },
  { key: 'doming_price', label: 'Prix Doming supplémentaire', type: 'number', suffix: '€', syncStripe: true, stripeProduct: 'doming' },
  { key: 'door_module_price', label: 'Prix Boîtier Gâche Électrique', type: 'number', suffix: '€', icon: DoorOpen, syncStripe: true, stripeProduct: 'door_module' },
  { key: 'members_included', label: 'Membres inclus', type: 'number', suffix: '' },
  { key: 'max_extra_members', label: 'Membres supplémentaires max', type: 'number', suffix: '' },
  { key: 'extra_member_price', label: 'Tarif/Membre supplémentaire', type: 'number', suffix: '€/mois' },
  // Communication features
  { key: 'interphone_incoming', label: 'Interphone appels entrants', type: 'boolean', icon: Phone },
  { key: 'video_calls', label: 'Appels visio', type: 'boolean', icon: Video },
  { key: 'text_messages', label: 'Messages texte', type: 'boolean', icon: MessageSquare },
  { key: 'voice_messages', label: 'Messages vocaux', type: 'boolean', icon: Mic },
  { key: 'video_messages', label: 'Messages vidéo', type: 'boolean', icon: Video },
  { key: 'instant_chat', label: 'Messagerie chat instantanée', type: 'boolean', icon: MessageSquare },
  // Advanced features
  { key: 'copilot', label: 'Co-Pilot IA', type: 'boolean', icon: Bot },
  { key: 'geolocation', label: 'Géofencing avancé', type: 'boolean', icon: MapPin },
  { key: 'scheduling', label: 'Planification accès', type: 'boolean', icon: Calendar },
  { key: 'facial_recognition', label: 'Reconnaissance faciale', type: 'boolean', icon: ScanFace },
];

const Config = () => {
  const { configs, isLoading, updateConfig, isUpdating, refetch } = useAppConfig();
  const [localChanges, setLocalChanges] = useState<Record<string, any>>({});
  const [syncingStripe, setSyncingStripe] = useState<string | null>(null);
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

  const saveConfigWithStripeSync = async (planId: string, price: number, configKey: string, productType?: string) => {
    setSyncingStripe(configKey);
    try {
      // First save the config locally
      await updateConfig({ key: configKey, value: price });
      
      // Determine the actual planId for Stripe based on the configKey
      let stripePlanId = planId;
      let stripeProductType = productType;
      
      // Handle doming prices - they ARE plan-specific (pro_doming, entreprise_doming, etc.)
      if (configKey.endsWith('_doming_price')) {
        // Extract plan from configKey: "pro_doming_price" -> "pro_doming"
        stripePlanId = configKey.replace('_price', '');
        stripeProductType = 'one_time';
      } else if (configKey.endsWith('_door_module_price')) {
        // Extract plan from configKey: "pro_door_module_price" -> "pro_door_module"
        stripePlanId = configKey.replace('_price', '');
        stripeProductType = 'one_time';
      } else if (configKey.endsWith('_extra_member_price')) {
        // Extract plan from configKey: "pro_extra_member_price" -> "pro_extra_member"
        stripePlanId = configKey.replace('_price', '');
        stripeProductType = 'recurring';
      }
      
      // Then sync with Stripe
      const { data, error } = await supabase.functions.invoke('sync-stripe-price', {
        body: { planId: stripePlanId, annualPrice: price, productType: stripeProductType }
      });

      if (error) throw error;

      setLocalChanges(prev => {
        const next = { ...prev };
        delete next[configKey];
        return next;
      });

      // Refresh configs to get updated Stripe price ID
      await refetch();
      
      toast.success(`Prix synchronisé avec Stripe (${data.priceId})`);
    } catch (error: any) {
      console.error('Stripe sync error:', error);
      toast.error(`Erreur sync Stripe: ${error.message}`);
    } finally {
      setSyncingStripe(null);
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
                      onCheckedChange={async (checked) => {
                        try {
                          await updateConfig({ key: configKey, value: checked });
                          toast.success('Configuration mise à jour');
                        } catch (error) {
                          toast.error('Erreur lors de la mise à jour');
                        }
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

            const isSyncingThis = syncingStripe === configKey;

            return (
              <div key={feature.key} className="space-y-2">
                <Label className="text-sm text-muted-foreground flex items-center gap-2">
                  {feature.label}
                  {feature.syncStripe && (
                    <Badge variant="outline" className="text-xs font-normal">
                      <CreditCard className="w-3 h-3 mr-1" />
                      Sync Stripe
                    </Badge>
                  )}
                </Label>
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
                    <Button 
                      size="icon" 
                      variant="default" 
                      onClick={() => {
                        if (feature.syncStripe) {
                          const productType = feature.stripeProduct ? 'one_time' : undefined;
                          saveConfigWithStripeSync(feature.stripeProduct || planId, localChanges[configKey], configKey, productType);
                        } else {
                          saveConfig(configKey);
                        }
                      }}
                      disabled={isUpdating || isSyncingThis}
                    >
                      {isSyncingThis ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
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
            <TabsTrigger value="features">Fonctionnalités</TabsTrigger>
            <TabsTrigger value="limits">Limites</TabsTrigger>
            <TabsTrigger value="content">Contenu</TabsTrigger>
            <TabsTrigger value="facturation">Facturation</TabsTrigger>
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

            {/* Stripe Price IDs - Récapitulatif complet */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Récapitulatif Stripe Price IDs
                </CardTitle>
                <CardDescription>
                  Tous les IDs Stripe configurés dans l'application avec les prix associés
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Abonnements */}
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Abonnements (récurrents)
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">Plan</th>
                          <th className="text-left py-2 font-medium">Clé Config</th>
                          <th className="text-left py-2 font-medium font-mono">Stripe Price ID</th>
                          <th className="text-right py-2 font-medium">Prix Config</th>
                        </tr>
                      </thead>
                      <tbody>
                        {PLANS.map((plan) => {
                          const priceIdKey = `${plan.id}_stripe_price_id`;
                          const annualPriceKey = `${plan.id}_annual_price`;
                          const priceId = getValue(priceIdKey) || '-';
                          const annualPrice = getValue(annualPriceKey) || 0;
                          const PlanIcon = plan.icon;
                          return (
                            <tr key={plan.id} className="border-b border-border/50">
                              <td className="py-2 flex items-center gap-2">
                                <PlanIcon className={`w-4 h-4 ${plan.color}`} />
                                {plan.name}
                              </td>
                              <td className="py-2 text-muted-foreground text-xs">{priceIdKey}</td>
                              <td className="py-2 font-mono text-xs">{priceId}</td>
                              <td className="py-2 text-right font-medium">{annualPrice}€/an</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Domings par plan */}
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Domings QR/NFC (par plan)
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">Plan</th>
                          <th className="text-left py-2 font-medium">Clé Config</th>
                          <th className="text-left py-2 font-medium font-mono">Stripe Price ID</th>
                          <th className="text-right py-2 font-medium">Prix Config</th>
                        </tr>
                      </thead>
                      <tbody>
                        {PLANS.map((plan) => {
                          const priceIdKey = `${plan.id}_doming_stripe_price_id`;
                          const priceKey = `${plan.id}_doming_price`;
                          const priceId = getValue(priceIdKey) || '-';
                          const price = getValue(priceKey) || 0;
                          const PlanIcon = plan.icon;
                          return (
                            <tr key={plan.id} className="border-b border-border/50">
                              <td className="py-2 flex items-center gap-2">
                                <PlanIcon className={`w-4 h-4 ${plan.color}`} />
                                Doming {plan.name}
                              </td>
                              <td className="py-2 text-muted-foreground text-xs">{priceIdKey}</td>
                              <td className="py-2 font-mono text-xs">{priceId}</td>
                              <td className="py-2 text-right font-medium">{price}€</td>
                            </tr>
                          );
                        })}
                        {/* Doming générique */}
                        <tr className="border-b border-border/50">
                          <td className="py-2 text-muted-foreground">Doming (legacy)</td>
                          <td className="py-2 text-muted-foreground text-xs">doming_stripe_price_id</td>
                          <td className="py-2 font-mono text-xs">{getValue('doming_stripe_price_id') || '-'}</td>
                          <td className="py-2 text-right font-medium">{getValue('doming_price') || 0}€</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Modules Porte par plan */}
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <DoorOpen className="w-4 h-4" />
                    Gâches Électriques (par plan)
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">Plan</th>
                          <th className="text-left py-2 font-medium">Clé Config</th>
                          <th className="text-left py-2 font-medium font-mono">Stripe Price ID</th>
                          <th className="text-right py-2 font-medium">Prix Config</th>
                        </tr>
                      </thead>
                      <tbody>
                        {PLANS.map((plan) => {
                          const priceIdKey = `${plan.id}_door_module_stripe_price_id`;
                          const priceKey = `${plan.id}_door_module_price`;
                          const priceId = getValue(priceIdKey) || '-';
                          const price = getValue(priceKey) || 0;
                          const PlanIcon = plan.icon;
                          return (
                            <tr key={plan.id} className="border-b border-border/50">
                              <td className="py-2 flex items-center gap-2">
                                <PlanIcon className={`w-4 h-4 ${plan.color}`} />
                                Gâche {plan.name}
                              </td>
                              <td className="py-2 text-muted-foreground text-xs">{priceIdKey}</td>
                              <td className="py-2 font-mono text-xs">{priceId}</td>
                              <td className="py-2 text-right font-medium">{price}€</td>
                            </tr>
                          );
                        })}
                        {/* Door module générique */}
                        <tr className="border-b border-border/50">
                          <td className="py-2 text-muted-foreground">Door Module (legacy)</td>
                          <td className="py-2 text-muted-foreground text-xs">door_module_stripe_price_id</td>
                          <td className="py-2 font-mono text-xs">{getValue('door_module_stripe_price_id') || '-'}</td>
                          <td className="py-2 text-right font-medium">{getValue('door_module_price') || 0}€</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Membres supplémentaires par plan */}
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Membres Supplémentaires (par plan)
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">Plan</th>
                          <th className="text-left py-2 font-medium">Clé Config</th>
                          <th className="text-left py-2 font-medium font-mono">Stripe Price ID</th>
                          <th className="text-right py-2 font-medium">Prix Config</th>
                        </tr>
                      </thead>
                      <tbody>
                        {PLANS.map((plan) => {
                          const priceIdKey = `${plan.id}_extra_member_stripe_price_id`;
                          const priceKey = `${plan.id}_extra_member_price`;
                          const priceId = getValue(priceIdKey) || '-';
                          const price = getValue(priceKey) || 0;
                          const PlanIcon = plan.icon;
                          return (
                            <tr key={plan.id} className="border-b border-border/50">
                              <td className="py-2 flex items-center gap-2">
                                <PlanIcon className={`w-4 h-4 ${plan.color}`} />
                                Extra {plan.name}
                              </td>
                              <td className="py-2 text-muted-foreground text-xs">{priceIdKey}</td>
                              <td className="py-2 font-mono text-xs">{priceId}</td>
                              <td className="py-2 text-right font-medium">{price}€/mois</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                  💡 Les prix sont synchronisés automatiquement avec Stripe lorsque vous modifiez les tarifs ci-dessus et cliquez sur Enregistrer.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FEATURES TAB */}
          <TabsContent value="features" className="space-y-6">
            {/* Plans Activation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ToggleLeft className="w-5 h-5" />
                  Offres actives
                </CardTitle>
                <CardDescription>
                  Activer ou désactiver les différentes offres disponibles à l'inscription
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'plan_particulier_enabled', label: 'Offre Particuliers', icon: Home, color: 'text-blue-600' },
                  { key: 'plan_pro_enabled', label: 'Offre Pro', icon: Building, color: 'text-orange-600' },
                  { key: 'plan_entreprise_enabled', label: 'Offre Entreprise', icon: Building2, color: 'text-purple-600' },
                  { key: 'plan_collectivites_enabled', label: 'Offre Collectivités', icon: Landmark, color: 'text-green-600' },
                ].map(({ key, label, icon: Icon, color }) => {
                  const isEnabled = getValue(key) === true || getValue(key) === 'true';
                  return (
                    <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${color}`} />
                        <span className="font-medium">{label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={async (checked) => {
                            try {
                              await updateConfig({ key, value: checked });
                              toast.success(`${label} ${checked ? 'activée' : 'désactivée'}`);
                            } catch (error) {
                              toast.error('Erreur lors de la mise à jour');
                            }
                          }}
                          disabled={isUpdating}
                        />
                        <Badge variant={isEnabled ? "default" : "secondary"} className={isEnabled ? "bg-green-600" : ""}>
                          {isEnabled ? "Activée" : "Désactivée"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Communication Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Communication
                </CardTitle>
                <CardDescription>
                  Activer ou désactiver les fonctionnalités de communication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'feature_voice_calls_enabled', label: 'Appels vocaux', icon: Phone, description: 'Permettre les appels audio entre visiteurs et résidents' },
                  { key: 'feature_video_calls_enabled', label: 'Appels vidéo', icon: Video, description: 'Permettre la vidéo lors des appels (visiteur → résident)' },
                  { key: 'feature_visitor_text_messages_enabled', label: 'Messages texte visiteurs', icon: MessageSquare, description: 'Permettre aux visiteurs de laisser des messages écrits' },
                  { key: 'feature_visitor_voice_messages_enabled', label: 'Messages vocaux visiteurs', icon: Mic, description: 'Permettre aux visiteurs de laisser des messages vocaux' },
                ].map(({ key, label, icon: Icon, description }) => {
                  const isEnabled = getValue(key) === true || getValue(key) === 'true';
                  return (
                    <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{label}</span>
                          <p className="text-sm text-muted-foreground">{description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={async (checked) => {
                            try {
                              await updateConfig({ key, value: checked });
                              toast.success(`${label} ${checked ? 'activé' : 'désactivé'}`);
                            } catch (error) {
                              toast.error('Erreur lors de la mise à jour');
                            }
                          }}
                          disabled={isUpdating}
                        />
                        <Badge variant={isEnabled ? "default" : "secondary"} className={isEnabled ? "bg-green-600" : ""}>
                          {isEnabled ? "Activé" : "Désactivé"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Door Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DoorOpen className="w-5 h-5" />
                  Ouverture de porte
                </CardTitle>
                <CardDescription>
                  Activer ou désactiver les fonctionnalités d'accès par porte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'feature_door_opening_enabled', label: 'Ouverture de porte BLE', icon: DoorOpen, description: 'Permettre l\'ouverture de porte via Bluetooth Low Energy' },
                  { key: 'feature_scheduled_access_enabled', label: 'Autorisations d\'accès programmés', icon: Key, description: 'Permettre la planification d\'accès pour des tiers' },
                ].map(({ key, label, icon: Icon, description }) => {
                  const isEnabled = getValue(key) === true || getValue(key) === 'true';
                  return (
                    <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{label}</span>
                          <p className="text-sm text-muted-foreground">{description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={async (checked) => {
                            try {
                              await updateConfig({ key, value: checked });
                              toast.success(`${label} ${checked ? 'activé' : 'désactivé'}`);
                            } catch (error) {
                              toast.error('Erreur lors de la mise à jour');
                            }
                          }}
                          disabled={isUpdating}
                        />
                        <Badge variant={isEnabled ? "default" : "secondary"} className={isEnabled ? "bg-green-600" : ""}>
                          {isEnabled ? "Activé" : "Désactivé"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Business Modules */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Modules métier
                </CardTitle>
                <CardDescription>
                  Activer ou désactiver les modules complets de l'application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'feature_copilot_module_enabled', label: 'Co-Pilot IA', icon: Sparkles, description: 'Assistant IA pour guider les utilisateurs dans l\'application' },
                  { key: 'feature_carrier_module_enabled', label: 'Module Livreurs', icon: Truck, description: 'Accès transporteurs, tournées, preuves de livraison offline' },
                  { key: 'relay_module_enabled', label: 'Module Relais Colis', icon: Package, description: 'Points relais, dépôt/retrait de colis' },
                  { key: 'feature_parcel_delivery_enabled', label: 'Réception Colis', icon: PackageCheck, description: 'Permettre aux résidents de recevoir des colis' },
                  { key: 'feature_door_module_sales_enabled', label: 'Vente Boîtier Gâche', icon: DoorOpen, description: 'Afficher le boîtier gâche électrique dans la boutique' },
                  { key: 'feature_referral_enabled', label: 'Parrainage', icon: Gift, description: 'Module de parrainage et récompenses' },
                ].map(({ key, label, icon: Icon, description }) => {
                  const isEnabled = getValue(key) === true || getValue(key) === 'true';
                  return (
                    <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{label}</span>
                          <p className="text-sm text-muted-foreground">{description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={async (checked) => {
                            try {
                              await updateConfig({ key, value: checked });
                              toast.success(`${label} ${checked ? 'activé' : 'désactivé'}`);
                            } catch (error) {
                              toast.error('Erreur lors de la mise à jour');
                            }
                          }}
                          disabled={isUpdating}
                        />
                        <Badge variant={isEnabled ? "default" : "secondary"} className={isEnabled ? "bg-green-600" : ""}>
                          {isEnabled ? "Activé" : "Désactivé"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
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

          {/* FACTURATION TAB */}
          <TabsContent value="facturation" className="space-y-6">
            {/* Tarifs Module Relais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Tarifs Module Relais - Facturation Transporteurs
                </CardTitle>
                <CardDescription>
                  Tarifs facturés aux transporteurs pour chaque type de preuve de livraison
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Tarif par dépôt en point relais (€)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      step="0.01"
                      value={getValue('carrier_rate_per_relay_deposit') || 0.30}
                      onChange={(e) => setLocalValue('carrier_rate_per_relay_deposit', parseFloat(e.target.value))}
                      placeholder="0.30"
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">€ / dépôt relais</span>
                    {hasChanges('carrier_rate_per_relay_deposit') && (
                      <Button size="sm" onClick={() => saveConfig('carrier_rate_per_relay_deposit')} disabled={isUpdating}>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Tarif par preuve de passage chez le destinataire (€)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      step="0.01"
                      value={getValue('carrier_rate_per_direct_delivery') || 0.25}
                      onChange={(e) => setLocalValue('carrier_rate_per_direct_delivery', parseFloat(e.target.value))}
                      placeholder="0.25"
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">€ / passage destinataire</span>
                    {hasChanges('carrier_rate_per_direct_delivery') && (
                      <Button size="sm" onClick={() => saveConfig('carrier_rate_per_direct_delivery')} disabled={isUpdating}>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Tarif par preuve de retrait au relais colis (€)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      step="0.01"
                      value={getValue('carrier_rate_per_relay_pickup') || 0.20}
                      onChange={(e) => setLocalValue('carrier_rate_per_relay_pickup', parseFloat(e.target.value))}
                      placeholder="0.20"
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">€ / retrait relais</span>
                    {hasChanges('carrier_rate_per_relay_pickup') && (
                      <Button size="sm" onClick={() => saveConfig('carrier_rate_per_relay_pickup')} disabled={isUpdating}>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Jour de facturation mensuelle</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      min="1"
                      max="28"
                      value={getValue('carrier_invoice_day_of_month') || 1}
                      onChange={(e) => setLocalValue('carrier_invoice_day_of_month', parseInt(e.target.value))}
                      placeholder="1"
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">du mois</span>
                    {hasChanges('carrier_invoice_day_of_month') && (
                      <Button size="sm" onClick={() => saveConfig('carrier_invoice_day_of_month')} disabled={isUpdating}>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rémunération Points Relais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Rémunération des Points Relais
                </CardTitle>
                <CardDescription>
                  Tarifs de rémunération versés aux points relais pour chaque colis traité
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Tarif par colis déposé (€)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      step="0.01"
                      value={getValue('relay_rate_per_deposit') || 0.50}
                      onChange={(e) => setLocalValue('relay_rate_per_deposit', parseFloat(e.target.value))}
                      placeholder="0.50"
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">€ / dépôt</span>
                    {hasChanges('relay_rate_per_deposit') && (
                      <Button size="sm" onClick={() => saveConfig('relay_rate_per_deposit')} disabled={isUpdating}>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Tarif par colis remis au destinataire (€)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      step="0.01"
                      value={getValue('relay_rate_per_parcel') || 1.50}
                      onChange={(e) => setLocalValue('relay_rate_per_parcel', parseFloat(e.target.value))}
                      placeholder="1.50"
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">€ / remise</span>
                    {hasChanges('relay_rate_per_parcel') && (
                      <Button size="sm" onClick={() => saveConfig('relay_rate_per_parcel')} disabled={isUpdating}>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Seuil minimum de paiement (€)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      step="1"
                      value={getValue('relay_minimum_payout') || 20}
                      onChange={(e) => setLocalValue('relay_minimum_payout', parseFloat(e.target.value))}
                      placeholder="20"
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">€ minimum avant paiement</span>
                    {hasChanges('relay_minimum_payout') && (
                      <Button size="sm" onClick={() => saveConfig('relay_minimum_payout')} disabled={isUpdating}>
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
                  <Building className="w-5 h-5" />
                  Informations entreprise sur les factures
                </CardTitle>
                <CardDescription>
                  Ces informations apparaîtront sur toutes les factures générées
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Nom de l'entreprise</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="text"
                      value={getValue('invoice_company_name') || ''}
                      onChange={(e) => setLocalValue('invoice_company_name', e.target.value)}
                      placeholder="ANR - Adresse Numérique Résidentielle"
                      className="flex-1"
                    />
                    {hasChanges('invoice_company_name') && (
                      <Button size="sm" onClick={() => saveConfig('invoice_company_name')} disabled={isUpdating}>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Numéro SIRET</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="text"
                      value={getValue('invoice_siret') || ''}
                      onChange={(e) => setLocalValue('invoice_siret', e.target.value)}
                      placeholder="123 456 789 00000"
                      className="flex-1"
                    />
                    {hasChanges('invoice_siret') && (
                      <Button size="sm" onClick={() => saveConfig('invoice_siret')} disabled={isUpdating}>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Numéro TVA</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="text"
                      value={getValue('invoice_tva') || ''}
                      onChange={(e) => setLocalValue('invoice_tva', e.target.value)}
                      placeholder="FR12345678900"
                      className="flex-1"
                    />
                    {hasChanges('invoice_tva') && (
                      <Button size="sm" onClick={() => saveConfig('invoice_tva')} disabled={isUpdating}>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Adresse de l'entreprise</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="text"
                      value={getValue('invoice_address') || ''}
                      onChange={(e) => setLocalValue('invoice_address', e.target.value)}
                      placeholder="1 rue de l'Innovation, 75001 Paris"
                      className="flex-1"
                    />
                    {hasChanges('invoice_address') && (
                      <Button size="sm" onClick={() => saveConfig('invoice_address')} disabled={isUpdating}>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Email de contact (factures)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="email"
                      value={getValue('invoice_contact_email') || ''}
                      onChange={(e) => setLocalValue('invoice_contact_email', e.target.value)}
                      placeholder="contact@anr.fr"
                      className="flex-1"
                    />
                    {hasChanges('invoice_contact_email') && (
                      <Button size="sm" onClick={() => saveConfig('invoice_contact_email')} disabled={isUpdating}>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    )}
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
