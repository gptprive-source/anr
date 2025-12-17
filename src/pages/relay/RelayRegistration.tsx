import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Clock, MapPin, CreditCard, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useRelayPoint } from "@/hooks/useRelayPoint";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/layout/BottomNav";

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

const RelayRegistration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { relayPoint, isRelayPoint, createRelayPoint, isCreating } = useRelayPoint();
  
  const [formData, setFormData] = useState({
    display_name: '',
    phone: '',
    max_capacity: 5,
    iban: '',
    accepted_parcel_types: ['standard'] as string[],
    availability_schedule: {} as Record<string, { from: string; to: string }>,
  });

  const [anrId, setAnrId] = useState<string | null>(null);

  // Fetch user's ANR
  useEffect(() => {
    const fetchUserAnr = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from('residents')
        .select('habitations:habitation_id(anr_id)')
        .eq('user_id', user.id)
        .eq('status', 'verified')
        .single();

      if (data?.habitations) {
        setAnrId((data.habitations as any).anr_id);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!anrId) {
      toast.error('Vous devez avoir une habitation ANR pour devenir relais');
      return;
    }

    if (!formData.display_name.trim()) {
      toast.error('Veuillez entrer un nom d\'affichage');
      return;
    }

    if (formData.accepted_parcel_types.length === 0) {
      toast.error('Veuillez sélectionner au moins un type de colis');
      return;
    }

    if (Object.keys(formData.availability_schedule).length === 0) {
      toast.error('Veuillez définir vos disponibilités');
      return;
    }

    try {
      await createRelayPoint({
        anr_id: anrId,
        display_name: formData.display_name,
        phone: formData.phone || undefined,
        max_capacity: formData.max_capacity,
        accepted_parcel_types: formData.accepted_parcel_types,
        availability_schedule: formData.availability_schedule,
        iban: formData.iban || undefined,
      });

      toast.success('Inscription relais envoyée ! En attente de vérification.');
      navigate('/relay');
    } catch (error: any) {
      console.error('Error creating relay point:', error);
      toast.error(error.message || 'Erreur lors de l\'inscription');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Devenir Point Relais</h1>
            <p className="text-sm opacity-80">Gagnez de l'argent en recevant des colis</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Package className="w-8 h-8 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Comment ça marche ?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  En tant que point relais ANR, vous recevez les colis des voisins et êtes rémunéré pour chaque colis traité. 
                  Les livreurs déposent les colis chez vous et les destinataires viennent les récupérer.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Display Name */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Informations du relais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Nom d'affichage *</Label>
              <Input
                id="display_name"
                placeholder="Ex: Chez Martin"
                value={formData.display_name}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                required
              />
              <p className="text-xs text-muted-foreground">Ce nom sera visible par les livreurs et destinataires</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone (optionnel)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="06 12 34 56 78"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_capacity">Capacité maximale (colis)</Label>
              <Input
                id="max_capacity"
                type="number"
                min={1}
                max={50}
                value={formData.max_capacity}
                onChange={(e) => setFormData(prev => ({ ...prev, max_capacity: parseInt(e.target.value) || 5 }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Parcel Types */}
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
                <Checkbox checked={formData.accepted_parcel_types.includes(type.id)} />
                <div className="flex-1">
                  <p className="font-medium">{type.label}</p>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Availability Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Disponibilités
            </CardTitle>
            <CardDescription>Définissez vos horaires de disponibilité</CardDescription>
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
                      <Checkbox checked={isActive} />
                      <span className="font-medium">{day.label}</span>
                    </div>
                    {isActive && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
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

        {/* Payment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Informations de paiement
            </CardTitle>
            <CardDescription>Pour recevoir vos gains (optionnel, modifiable plus tard)</CardDescription>
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
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <Button type="submit" className="w-full" size="lg" disabled={isCreating}>
          {isCreating ? 'Inscription en cours...' : 'Devenir point relais'}
        </Button>
      </form>

      <BottomNav />
    </div>
  );
};

export default RelayRegistration;
