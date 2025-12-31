import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Play, Square, Check, Loader2, Music, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRingtoneSettings } from '@/hooks/useRingtoneSettings';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const RingtoneSettings = () => {
  const navigate = useNavigate();
  const {
    ringtones,
    selectedRingtone,
    loading,
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/account')}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Sonnerie d'appel</h1>
              <p className="text-xs text-muted-foreground">
                Choisissez votre sonnerie préférée
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* Native picker button (Android only) */}
        {isNative && (
          <Button
            variant="outline"
            className="w-full gap-2 h-12"
            onClick={handleOpenNativePicker}
          >
            <Music className="w-5 h-5" />
            Choisir depuis le téléphone
          </Button>
        )}

        {/* Ringtone list */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground font-medium px-1">
            {isNative ? 'Ou choisir parmi nos sonneries :' : 'Sonneries disponibles :'}
          </p>
          
          {ringtones.map((ringtone) => (
            <div
              key={ringtone.id}
              className={cn(
                'flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer',
                selectedRingtone === ringtone.uri
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
              onClick={() => handleSelect(ringtone.uri)}
            >
              {/* Selection indicator */}
              <div className={cn(
                'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                selectedRingtone === ringtone.uri
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground/50'
              )}>
                {selectedRingtone === ringtone.uri && (
                  <Check className="w-3.5 h-3.5 text-primary-foreground" />
                )}
              </div>

              {/* Ringtone info */}
              <div className="flex-1 min-w-0">
                <span className="font-medium text-foreground">{ringtone.title}</span>
                {ringtone.category && (
                  <p className="text-xs text-muted-foreground">{ringtone.category}</p>
                )}
              </div>

              {/* Preview button */}
              <Button
                variant={playingUri === ringtone.uri ? "destructive" : "secondary"}
                size="sm"
                className="h-10 w-10 p-0 rounded-full shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreview(ringtone.uri);
                }}
              >
                {playingUri === ringtone.uri ? (
                  <Square className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </Button>
            </div>
          ))}
        </div>

        {saving && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Enregistrement...
          </div>
        )}
        
        {/* Info note */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-foreground">À propos des sonneries</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            La sonnerie personnalisée s'applique quand l'application est ouverte. 
            Quand l'app est fermée, la sonnerie système est utilisée pour les notifications.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RingtoneSettings;
