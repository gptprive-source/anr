import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2, User, Package, Clock, MapPin, CreditCard, Check, Square, CheckSquare, Upload, FileText, Loader2, X, Eye, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useRelayPoint } from "@/hooks/useRelayPoint";
import { useAppConfig } from "@/hooks/useAppConfig";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/layout/BottomNav";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

const PARCEL_TYPES = [
  { id: 'standard', label: 'Standard', description: 'Colis classiques jusqu\'à 30kg' },
  { id: 'fragile', label: 'Fragile', description: 'Colis nécessitant une manipulation délicate' },
  { id: 'volumineux', label: 'Volumineux', description: 'Colis de grande taille' },
];

const DAYS = [
  { id: 'lundi', label: 'Lundi' },
  { id: 'mardi', label: 'Mardi' },
  { id: 'mercredi', label: 'Mercredi' },
  { id: 'jeudi', label: 'Jeudi' },
  { id: 'vendredi', label: 'Vendredi' },
  { id: 'samedi', label: 'Samedi' },
  { id: 'dimanche', label: 'Dimanche' },
];

const STEPS = [
  { id: 'type', title: 'Type de relais' },
  { id: 'info', title: 'Informations' },
  { id: 'kyc', title: 'Vérification' },
  { id: 'availability', title: 'Disponibilités' },
  { id: 'payment', title: 'Paiement' },
];

type RelayType = 'professional' | 'individual';

// Document upload component with preview
const DocumentUploadCard = ({ 
  label, 
  description, 
  value, 
  onChange, 
  uploading,
  disabled 
}: { 
  label: string;
  description?: string;
  value: string;
  onChange: (file: File) => void;
  uploading: boolean;
  disabled?: boolean;
}) => {
  const isImage = value && (value.includes('.jpg') || value.includes('.jpeg') || value.includes('.png') || value.includes('.webp'));
  
  return (
    <div className="flex flex-col items-center gap-2">
      <Label className="text-center text-sm">{label}</Label>
      <div className="relative w-28 h-28 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-muted/30 hover:bg-muted/50 transition-colors">
        {value ? (
          <>
            {isImage ? (
              <Dialog>
                <DialogTrigger asChild>
                  <button className="w-full h-full relative group">
                    <img src={value} alt={label} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Eye className="w-6 h-6 text-white" />
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <img src={value} alt={label} className="w-full h-auto" />
                </DialogContent>
              </Dialog>
            ) : (
              <div className="flex flex-col items-center gap-1 text-primary">
                <FileText className="w-8 h-8" />
                <span className="text-xs">PDF</span>
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 p-1.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
              <Upload className="w-3 h-3" />
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onChange(file);
                }}
                disabled={uploading || disabled}
                className="hidden"
              />
            </label>
          </>
        ) : (
          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Upload className="w-6 h-6 mb-1" />
                <span className="text-xs text-center px-2">Ajouter</span>
              </>
            )}
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onChange(file);
              }}
              disabled={uploading || disabled}
              className="hidden"
            />
          </label>
        )}
      </div>
      {description && <p className="text-xs text-muted-foreground text-center">{description}</p>}
    </div>
  );
};

const RelayRegistration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { relayPoint, isRelayPoint, createRelayPoint, isCreating } = useRelayPoint();
  const { getConfig, isLoading: configLoading } = useAppConfig();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    // Step 1 - Type
    relay_type: '' as RelayType | '',
    // Step 2 - Basic info
    display_name: '',
    phone: '',
    relay_address: '',
    max_capacity: 10,
    // Step 3 - KYC Professional
    company_name: '',
    legal_form: '',
    siret: '',
    legal_representative_name: '',
    // Step 3 - KYC Common
    id_document_recto_url: '',
    id_document_verso_url: '',
    address_proof_url: '',
    // Step 4 - Availability
    accepted_parcel_types: ['standard'] as string[],
    availability_schedule: {} as Record<string, { from: string; to: string }>,
    // Step 5 - Payment
    iban: '',
  });

  const [anrId, setAnrId] = useState<string | null>(null);
  const [anrAddress, setAnrAddress] = useState<string | null>(null);

  // Get pricing from app_config
  const rateDeposit = parseFloat(getConfig('relay_rate_per_deposit')) || 0.50;
  const ratePickup = parseFloat(getConfig('relay_rate_per_parcel')) || 0.50;
  const rateTotal = rateDeposit + ratePickup;

  // Fetch user's ANR and pre-fill address
  useEffect(() => {
    const fetchUserAnr = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from('residents')
        .select('habitations:habitation_id(anr_id, anrs:anr_id(address))')
        .eq('user_id', user.id)
        .eq('status', 'verified')
        .single();

      if (data?.habitations) {
        const hab = data.habitations as any;
        setAnrId(hab.anr_id);
        const address = hab.anrs?.address || null;
        setAnrAddress(address);
        // Pre-fill relay_address with ANR address
        if (address && !formData.relay_address) {
          setFormData(prev => ({ ...prev, relay_address: address }));
        }
      }
    };

    fetchUserAnr();
  }, [user?.id]);

  // Redirect if already a relay point
  useEffect(() => {
    if (isRelayPoint) {
      navigate('/relay');
    }
  }, [isRelayPoint, navigate]);

  const handleFileUpload = async (file: File, field: string) => {
    if (!user?.id) return;
    
    setUploadingField(field);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${field}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('relay-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('relay-documents')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, [field]: urlData.publicUrl }));
      toast.success('Document uploadé avec succès');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploadingField(null);
    }
  };

  const handleParcelTypeToggle = (typeId: string) => {
    setFormData(prev => ({
      ...prev,
      accepted_parcel_types: prev.accepted_parcel_types.includes(typeId)
        ? prev.accepted_parcel_types.filter(t => t !== typeId)
        : [...prev.accepted_parcel_types, typeId],
    }));
  };

  const handleScheduleChange = (day: string, field: 'from' | 'to', value: string) => {
    setFormData(prev => ({
      ...prev,
      availability_schedule: {
        ...prev.availability_schedule,
        [day]: {
          ...prev.availability_schedule[day],
          [field]: value,
        },
      },
    }));
  };

  const toggleDay = (day: string) => {
    setFormData(prev => {
      const newSchedule = { ...prev.availability_schedule };
      if (newSchedule[day]) {
        delete newSchedule[day];
      } else {
        newSchedule[day] = { from: '09:00', to: '18:00' };
      }
      return { ...prev, availability_schedule: newSchedule };
    });
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Type
        if (!formData.relay_type) {
          toast.error('Veuillez choisir un type de relais');
          return false;
        }
        return true;
      case 1: // Info
        if (!formData.relay_address.trim()) {
          toast.error('Veuillez confirmer l\'adresse du point relais');
          return false;
        }
        if (anrAddress && formData.relay_address.trim() !== anrAddress) {
          toast.error('L\'adresse du relais doit correspondre à votre adresse ANR. Pour une autre adresse, vous devez d\'abord avoir un ANR valide avec abonnement à cette adresse.');
          return false;
        }
        if (!formData.display_name.trim()) {
          toast.error('Veuillez entrer un nom d\'affichage');
          return false;
        }
        return true;
      case 2: // KYC
        if (formData.relay_type === 'professional') {
          if (!formData.company_name || !formData.siret) {
            toast.error('Veuillez remplir les informations entreprise');
            return false;
          }
        }
        if (!formData.id_document_recto_url || !formData.id_document_verso_url) {
          toast.error('Veuillez uploader le recto ET le verso de votre pièce d\'identité');
          return false;
        }
        if (!formData.address_proof_url) {
          toast.error('Veuillez uploader un justificatif d\'adresse');
          return false;
        }
        return true;
      case 3: // Availability
        if (formData.accepted_parcel_types.length === 0) {
          toast.error('Veuillez sélectionner au moins un type de colis');
          return false;
        }
        if (Object.keys(formData.availability_schedule).length === 0) {
          toast.error('Veuillez définir vos disponibilités');
          return false;
        }
        return true;
      case 4: // Payment
        return true; // IBAN is optional
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!anrId) {
      toast.error('Vous devez avoir une habitation ANR pour devenir relais');
      return;
    }

    if (!validateStep(currentStep)) return;

    try {
      await createRelayPoint({
        anr_id: anrId,
        display_name: formData.display_name,
        phone: formData.phone || undefined,
        relay_address: formData.relay_address || undefined,
        max_capacity: formData.max_capacity,
        accepted_parcel_types: formData.accepted_parcel_types,
        availability_schedule: formData.availability_schedule,
        iban: formData.iban || undefined,
        // KYC fields
        relay_type: formData.relay_type as RelayType,
        company_name: formData.company_name || undefined,
        legal_form: formData.legal_form || undefined,
        siret: formData.siret || undefined,
        legal_representative_name: formData.legal_representative_name || undefined,
        id_document_url: formData.id_document_recto_url || undefined,
        id_document_verso_url: formData.id_document_verso_url || undefined,
        address_proof_url: formData.address_proof_url || undefined,
      });

      toast.success('Inscription relais envoyée ! En attente de vérification.');
      navigate('/relay');
    } catch (error: any) {
      console.error('Error creating relay point:', error);
      toast.error(error.message || 'Erreur lors de l\'inscription');
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => currentStep === 0 ? navigate(-1) : prevStep()} className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Devenir Point Relais</h1>
            <p className="text-sm opacity-80">Étape {currentStep + 1} sur {STEPS.length} - {STEPS[currentStep].title}</p>
          </div>
        </div>
        <Progress value={progress} className="mt-3 h-2" />
      </div>

      <div className="p-4 space-y-6">
        {/* Step 0: Type Selection */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Package className="w-8 h-8 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Quel type de relais êtes-vous ?</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Choisissez le profil qui correspond à votre situation. Cela déterminera les documents requis.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              <Card 
                className={`cursor-pointer transition-all ${formData.relay_type === 'professional' ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
                onClick={() => setFormData(prev => ({ ...prev, relay_type: 'professional' }))}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${formData.relay_type === 'professional' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">Relais Professionnel</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Commerce, entreprise, conciergerie ou gardien. Vous disposez d'un local commercial ou professionnel.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="text-xs bg-muted px-2 py-1 rounded">SIRET requis</span>
                        <span className="text-xs bg-muted px-2 py-1 rounded">Volume élevé</span>
                        <span className="text-xs bg-muted px-2 py-1 rounded">Facturation pro</span>
                      </div>
                    </div>
                    {formData.relay_type === 'professional' && <Check className="w-6 h-6 text-primary" />}
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all ${formData.relay_type === 'individual' ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
                onClick={() => setFormData(prev => ({ ...prev, relay_type: 'individual' }))}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${formData.relay_type === 'individual' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <User className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">Relais Particulier</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Habitant, résidence ou point de confiance. Vous recevez les colis à votre domicile privé.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="text-xs bg-muted px-2 py-1 rounded">Pièce d'identité</span>
                        <span className="text-xs bg-muted px-2 py-1 rounded">Volume limité</span>
                        <span className="text-xs bg-muted px-2 py-1 rounded">Processus simplifié</span>
                      </div>
                    </div>
                    {formData.relay_type === 'individual' && <Check className="w-6 h-6 text-primary" />}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Informations du relais
                </CardTitle>
                {!anrAddress && (
                  <CardDescription className="text-destructive">
                    Vous devez d'abord avoir une habitation ANR validée pour devenir relais.
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="relay_address">Adresse du point relais *</Label>
                  <Input
                    id="relay_address"
                    placeholder="123 rue de la Livraison, 75001 Paris"
                    value={formData.relay_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, relay_address: e.target.value }))}
                    required
                  />
                  {anrAddress && formData.relay_address && formData.relay_address.trim() !== '' && formData.relay_address !== anrAddress && (
                    <Card className="mt-3 border-amber-500/50 bg-amber-50 dark:bg-amber-900/20">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div className="space-y-2">
                            <p className="font-medium text-amber-800 dark:text-amber-300">
                              Adresse différente de votre ANR
                            </p>
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                              Votre adresse ANR actuelle : <span className="font-medium">{anrAddress}</span>
                            </p>
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                              Pour devenir relais à une adresse différente, vous devez disposer d'un <span className="font-semibold">ANR valide avec un abonnement actif</span> à cette nouvelle adresse.
                            </p>
                            <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                              Si vous souhaitez changer d'adresse relais, veuillez d'abord créer un compte ANR à la nouvelle adresse, puis vous désinscrire de votre relais actuel (préavis de 30 jours requis).
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {anrAddress && formData.relay_address === anrAddress && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Check className="w-3 h-3 text-green-500" /> Identique à votre adresse ANR
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display_name">Nom d'affichage *</Label>
                  <Input
                    id="display_name"
                    placeholder={formData.relay_type === 'professional' ? "Ex: Tabac Presse Martin" : "Ex: Chez Martin"}
                    value={formData.display_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Ce nom sera visible par les livreurs et destinataires</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="06 12 34 56 78"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_capacity">Capacité maximale (colis simultanés)</Label>
                  <Input
                    id="max_capacity"
                    type="number"
                    min={1}
                    max={200}
                    value={formData.max_capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_capacity: parseInt(e.target.value) || 10 }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.relay_type === 'professional' ? 'Recommandé: 20-100 pour un commerce' : 'Recommandé: 5-15 pour un particulier'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: KYC */}
        {currentStep === 2 && (
          <div className="space-y-4">
            {formData.relay_type === 'professional' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Informations entreprise
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Raison sociale *</Label>
                    <Input
                      id="company_name"
                      placeholder="SARL Martin Tabac"
                      value={formData.company_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="legal_form">Forme juridique</Label>
                    <Input
                      id="legal_form"
                      placeholder="SARL, SAS, EI..."
                      value={formData.legal_form}
                      onChange={(e) => setFormData(prev => ({ ...prev, legal_form: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="siret">SIRET *</Label>
                    <Input
                      id="siret"
                      placeholder="123 456 789 00012"
                      value={formData.siret}
                      onChange={(e) => setFormData(prev => ({ ...prev, siret: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="legal_representative_name">Nom du responsable légal</Label>
                    <Input
                      id="legal_representative_name"
                      placeholder="Jean Martin"
                      value={formData.legal_representative_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, legal_representative_name: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Pièce d'identité *
                </CardTitle>
                <CardDescription>
                  {formData.relay_type === 'professional' 
                    ? "Pièce d'identité du responsable légal (recto et verso)"
                    : "Carte d'identité ou passeport en cours de validité (recto et verso)"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center gap-6">
                  <DocumentUploadCard
                    label="Recto"
                    value={formData.id_document_recto_url}
                    onChange={(file) => handleFileUpload(file, 'id_document_recto_url')}
                    uploading={uploadingField === 'id_document_recto_url'}
                  />
                  <DocumentUploadCard
                    label="Verso"
                    value={formData.id_document_verso_url}
                    onChange={(file) => handleFileUpload(file, 'id_document_verso_url')}
                    uploading={uploadingField === 'id_document_verso_url'}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Justificatif d'adresse *
                </CardTitle>
                <CardDescription>
                  {formData.relay_type === 'professional' 
                    ? "Justificatif d'adresse du local (facture, bail...)"
                    : "Facture de moins de 3 mois ou avis d'imposition"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <DocumentUploadCard
                    label="Document"
                    value={formData.address_proof_url}
                    onChange={(file) => handleFileUpload(file, 'address_proof_url')}
                    uploading={uploadingField === 'address_proof_url'}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Availability */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Types de colis acceptés
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {PARCEL_TYPES.map((type) => (
                  <div
                    key={type.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      formData.accepted_parcel_types.includes(type.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => handleParcelTypeToggle(type.id)}
                  >
                    {formData.accepted_parcel_types.includes(type.id) ? (
                      <CheckSquare className="w-5 h-5 text-primary" />
                    ) : (
                      <Square className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{type.label}</p>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Horaires de disponibilité
                </CardTitle>
                <CardDescription>Quand pouvez-vous recevoir/remettre des colis ?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {DAYS.map((day) => {
                  const isActive = !!formData.availability_schedule[day.id];
                  return (
                    <div key={day.id} className="space-y-2">
                      <div
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer ${
                          isActive ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                        onClick={() => toggleDay(day.id)}
                      >
                        <div className="flex items-center gap-3">
                          {isActive ? (
                            <CheckSquare className="w-5 h-5 text-primary" />
                          ) : (
                            <Square className="w-5 h-5 text-muted-foreground" />
                          )}
                          <span className="font-medium">{day.label}</span>
                        </div>
                        {isActive && <Check className="w-4 h-4 text-primary" />}
                      </div>
                      {isActive && (
                        <div className="flex items-center gap-2 ml-8">
                          <Input
                            type="time"
                            value={formData.availability_schedule[day.id]?.from || '09:00'}
                            onChange={(e) => handleScheduleChange(day.id, 'from', e.target.value)}
                            className="w-32"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="text-muted-foreground">à</span>
                          <Input
                            type="time"
                            value={formData.availability_schedule[day.id]?.to || '18:00'}
                            onChange={(e) => handleScheduleChange(day.id, 'to', e.target.value)}
                            className="w-32"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Payment */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <Card className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <CreditCard className="w-8 h-8 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-green-800 dark:text-green-300">Rémunération</h3>
                    <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                      Vous gagnez <strong>{rateDeposit.toFixed(2)} €</strong> par dépôt et <strong>{ratePickup.toFixed(2)} €</strong> par retrait.
                      <br />Soit <strong>{rateTotal.toFixed(2)} € par colis complet</strong>.
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-400 mt-2">
                      Paiement mensuel automatique par virement SEPA.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Coordonnées bancaires
                </CardTitle>
                <CardDescription>Pour recevoir vos gains (modifiable plus tard)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="iban">IBAN</Label>
                  <Input
                    id="iban"
                    placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                    value={formData.iban}
                    onChange={(e) => setFormData(prev => ({ ...prev, iban: e.target.value.toUpperCase() }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Vous pourrez ajouter ou modifier votre IBAN plus tard dans les paramètres
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Récapitulatif</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">Type :</span> {formData.relay_type === 'professional' ? 'Professionnel' : 'Particulier'}</p>
                    <p><span className="text-muted-foreground">Nom :</span> {formData.display_name}</p>
                    <p><span className="text-muted-foreground">Capacité :</span> {formData.max_capacity} colis</p>
                    <p><span className="text-muted-foreground">Jours :</span> {Object.keys(formData.availability_schedule).length} jour(s)/semaine</p>
                    {formData.company_name && (
                      <p><span className="text-muted-foreground">Entreprise :</span> {formData.company_name}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button variant="outline" onClick={prevStep} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>
          )}
          
          {currentStep < STEPS.length - 1 ? (
            <Button onClick={nextStep} className="flex-1">
              Suivant
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isCreating} className="flex-1">
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Inscription en cours...
                </>
              ) : (
                'Soumettre ma demande'
              )}
            </Button>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default RelayRegistration;
