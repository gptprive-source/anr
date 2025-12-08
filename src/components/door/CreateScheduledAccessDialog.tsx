import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDoorAccess } from '@/hooks/useDoorAccess';
import { Loader2, Clock, User, Building2, Shield, UserPlus } from 'lucide-react';

interface CreateScheduledAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anrId: string;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
];

export function CreateScheduledAccessDialog({
  open,
  onOpenChange,
  anrId,
}: CreateScheduledAccessDialogProps) {
  const { createScheduledAccess, loading } = useDoorAccess(anrId);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    time_from: '08:00',
    time_to: '18:00',
    days_of_week: [1, 2, 3, 4, 5] as number[],
    valid_from: '',
    valid_until: '',
    accessType: 'guest' as 'user' | 'company' | 'guest',
    granted_to_user: '',
    granted_to_company: '',
    guest_name: '',
    guest_contact: '',
    require_face_recognition_entry: false,
    require_face_recognition_exit: false,
    max_entries_per_day: '',
    instructions_for_visitor: '',
  });

  const handleDayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day].sort(),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.time_from || !formData.time_to) return;

    await createScheduledAccess({
      name: formData.name,
      description: formData.description || undefined,
      time_from: formData.time_from,
      time_to: formData.time_to,
      days_of_week: formData.days_of_week.length > 0 ? formData.days_of_week : undefined,
      valid_from: formData.valid_from || undefined,
      valid_until: formData.valid_until || undefined,
      granted_to_user: formData.accessType === 'user' ? formData.granted_to_user || undefined : undefined,
      granted_to_company: formData.accessType === 'company' ? formData.granted_to_company || undefined : undefined,
      require_face_recognition_entry: formData.require_face_recognition_entry,
      require_face_recognition_exit: formData.require_face_recognition_exit,
      max_entries_per_day: formData.max_entries_per_day ? parseInt(formData.max_entries_per_day) : undefined,
      instructions_for_visitor: formData.instructions_for_visitor || undefined,
    });

    // Reset form
    setFormData({
      name: '',
      description: '',
      time_from: '08:00',
      time_to: '18:00',
      days_of_week: [1, 2, 3, 4, 5],
      valid_from: '',
      valid_until: '',
      accessType: 'guest',
      granted_to_user: '',
      granted_to_company: '',
      guest_name: '',
      guest_contact: '',
      require_face_recognition_entry: false,
      require_face_recognition_exit: false,
      max_entries_per_day: '',
      instructions_for_visitor: '',
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Nouvel accès programmé
          </DialogTitle>
          <DialogDescription>
            Créez une autorisation d'accès récurrente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Nom et description */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de l'autorisation *</Label>
              <Input
                id="name"
                placeholder="Ex: Femme de ménage"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Notes additionnelles..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          {/* Horaires */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horaires d'accès
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="time_from" className="text-sm text-muted-foreground">De</Label>
                <Input
                  id="time_from"
                  type="time"
                  value={formData.time_from}
                  onChange={(e) => setFormData({ ...formData, time_from: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time_to" className="text-sm text-muted-foreground">À</Label>
                <Input
                  id="time_to"
                  type="time"
                  value={formData.time_to}
                  onChange={(e) => setFormData({ ...formData, time_to: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Jours de la semaine */}
          <div className="space-y-3">
            <Label>Jours autorisés</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={formData.days_of_week.includes(day.value)}
                    onCheckedChange={() => handleDayToggle(day.value)}
                  />
                  <Label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Période de validité */}
          <div className="space-y-4">
            <Label>Période de validité (optionnel)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valid_from" className="text-sm text-muted-foreground">Du</Label>
                <Input
                  id="valid_from"
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valid_until" className="text-sm text-muted-foreground">Au</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Type de bénéficiaire */}
          <div className="space-y-4">
            <Label>Bénéficiaire</Label>
            <Select
              value={formData.accessType}
              onValueChange={(value: 'user' | 'company' | 'guest') => setFormData({ ...formData, accessType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="guest">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Invité sans compte (nounou, artisan...)
                  </div>
                </SelectItem>
                <SelectItem value="user">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Utilisateur ANR (avec compte)
                  </div>
                </SelectItem>
                <SelectItem value="company">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Entreprise / Prestataire Pro
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {formData.accessType === 'guest' && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <Input
                  placeholder="Nom de l'invité (ex: Marie - Nounou)"
                  value={formData.guest_name}
                  onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                />
                <Input
                  placeholder="Téléphone ou email (pour envoyer le lien d'accès)"
                  value={formData.guest_contact}
                  onChange={(e) => setFormData({ ...formData, guest_contact: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Un lien d'accès unique sera généré et pourra être envoyé par SMS, email ou QR code.
                </p>
              </div>
            )}

            {formData.accessType === 'user' && (
              <Input
                placeholder="Email ou ID de l'utilisateur ANR"
                value={formData.granted_to_user}
                onChange={(e) => setFormData({ ...formData, granted_to_user: e.target.value })}
              />
            )}

            {formData.accessType === 'company' && (
              <Input
                placeholder="Nom ou ID de l'entreprise Pro"
                value={formData.granted_to_company}
                onChange={(e) => setFormData({ ...formData, granted_to_company: e.target.value })}
              />
            )}
          </div>

          {/* Sécurité */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Sécurité renforcée
            </Label>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="face_entry" className="text-sm">
                  Reconnaissance faciale à l'entrée
                </Label>
                <p className="text-xs text-muted-foreground">
                  Vérification biométrique obligatoire
                </p>
              </div>
              <Switch
                id="face_entry"
                checked={formData.require_face_recognition_entry}
                onCheckedChange={(checked) => setFormData({ ...formData, require_face_recognition_entry: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="face_exit" className="text-sm">
                  Reconnaissance faciale à la sortie
                </Label>
                <p className="text-xs text-muted-foreground">
                  Pour pointage précis des heures
                </p>
              </div>
              <Switch
                id="face_exit"
                checked={formData.require_face_recognition_exit}
                onCheckedChange={(checked) => setFormData({ ...formData, require_face_recognition_exit: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_entries">Nombre max d'entrées/jour</Label>
              <Input
                id="max_entries"
                type="number"
                min="1"
                placeholder="Illimité"
                value={formData.max_entries_per_day}
                onChange={(e) => setFormData({ ...formData, max_entries_per_day: e.target.value })}
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions pour le visiteur</Label>
            <Textarea
              id="instructions"
              placeholder="Instructions affichées au visiteur lors de l'accès..."
              value={formData.instructions_for_visitor}
              onChange={(e) => setFormData({ ...formData, instructions_for_visitor: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !formData.name}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Créer l'accès
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
