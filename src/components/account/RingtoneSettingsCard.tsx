import { useState } from 'react';
import { Bell, Play, Square, Check, Loader2, Music } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRingtoneSettings } from '@/hooks/useRingtoneSettings';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const RingtoneSettingsCard = () => {
  const {
    ringtones,
    selectedRingtone,
    loading,
    isPlaying,
    saveRingtone,
    previewRingtone,
    stopPreview,
    openNativePicker,
    isNative,
  } = useRingtoneSettings();
  
  const { toast } = useToast();
  const [playingUri, setPlayingUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handlePreview = async (uri: string) => {
    if (playingUri === uri) {
      await stopPreview();
      setPlayingUri(null);
    } else {
      setPlayingUri(uri);
      await previewRingtone(uri);
      setTimeout(() => setPlayingUri(null), 3000);
    }
  };

  const handleSelect = async (uri: string) => {
    setSaving(true);
    try {
      await saveRingtone(uri);
      toast({
        title: 'Sonnerie enregistrée',
        description: 'Votre sonnerie personnalisée a été mise à jour.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder la sonnerie.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenNativePicker = async () => {
    const ringtone = await openNativePicker();
    if (ringtone) {
      toast({
        title: 'Sonnerie sélectionnée',
        description: `${ringtone.title} a été définie comme sonnerie.`,
      });
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-neumorphic-inset">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground">Sonnerie d'appel</p>
          <p className="text-xs text-muted-foreground">
            Choisissez la sonnerie pour les appels entrants
          </p>
        </div>
      </div>

      {/* Native picker button (Android only) */}
      {isNative && (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleOpenNativePicker}
        >
          <Music className="w-4 h-4" />
          Choisir depuis le téléphone
        </Button>
      )}

      {/* Ringtone list */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground font-medium">
          {isNative ? 'Ou choisir parmi :' : 'Sonneries disponibles :'}
        </p>
        
        {ringtones.map((ringtone) => (
          <div
            key={ringtone.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer',
              selectedRingtone === ringtone.uri
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
            onClick={() => handleSelect(ringtone.uri)}
          >
            {/* Selection indicator */}
            <div className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
              selectedRingtone === ringtone.uri
                ? 'border-primary bg-primary'
                : 'border-muted-foreground'
            )}>
              {selectedRingtone === ringtone.uri && (
                <Check className="w-3 h-3 text-primary-foreground" />
              )}
            </div>

            {/* Ringtone title */}
            <span className="flex-1 font-medium text-sm">{ringtone.title}</span>

            {/* Preview button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handlePreview(ringtone.uri);
              }}
            >
              {playingUri === ringtone.uri ? (
                <Square className="w-4 h-4 text-destructive" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
          </div>
        ))}
      </div>

      {saving && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Enregistrement...
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        Note : La sonnerie personnalisée s'applique quand l'application est ouverte. 
        Quand l'app est fermée, c'est la sonnerie système qui est utilisée.
      </p>
    </Card>
  );
};
