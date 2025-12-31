import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Play, Square, Check, Loader2, Music, ChevronLeft, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRingtoneSettings } from '@/hooks/useRingtoneSettings';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const RingtoneSettings = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    ringtones,
    customRingtones,
    selectedRingtone,
    loading,
    uploading,
    saveRingtone,
    uploadRingtone,
    deleteCustomRingtone,
    previewRingtone,
    stopPreview,
    openNativePicker,
    isNative,
  } = useRingtoneSettings();
  
  const { toast } = useToast();
  const [playingUri, setPlayingUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingUri, setDeletingUri] = useState<string | null>(null);

  const handlePreview = async (uri: string) => {
    if (playingUri === uri) {
      await stopPreview();
      setPlayingUri(null);
    } else {
      setPlayingUri(uri);
      await previewRingtone(uri);
      setTimeout(() => setPlayingUri(null), 5000);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const ringtone = await uploadRingtone(file);
      toast({
        title: 'Sonnerie importée',
        description: `"${ringtone.title}" a été ajoutée à vos sonneries.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erreur d\'import',
        description: error.message || 'Impossible d\'importer le fichier.',
        variant: 'destructive',
      });
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (e: React.MouseEvent, uri: string, title: string) => {
    e.stopPropagation();
    
    if (!confirm(`Supprimer "${title}" ?`)) return;
    
    setDeletingUri(uri);
    try {
      await deleteCustomRingtone(uri);
      toast({
        title: 'Sonnerie supprimée',
        description: `"${title}" a été supprimée.`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la sonnerie.',
        variant: 'destructive',
      });
    } finally {
      setDeletingUri(null);
    }
  };

  const isCustomRingtone = (uri: string) => {
    return customRingtones.some(r => r.uri === uri);
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
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/x-m4a,.mp3,.wav,.ogg,.m4a"
        className="hidden"
        onChange={handleFileSelect}
      />

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
        {/* Upload button */}
        <Button
          variant="outline"
          className="w-full gap-2 h-12 border-dashed"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Import en cours...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Importer ma sonnerie (MP3, WAV...)
            </>
          )}
        </Button>

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
            Sonneries disponibles :
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

              {/* Delete button for custom ringtones */}
              {isCustomRingtone(ringtone.uri) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 rounded-full shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => handleDelete(e, ringtone.uri, ringtone.title)}
                  disabled={deletingUri === ringtone.uri}
                >
                  {deletingUri === ringtone.uri ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              )}

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
            Importez vos propres fichiers audio (MP3, WAV, OGG, M4A - max 5MB).
            La sonnerie personnalisée s'applique quand l'application est ouverte.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RingtoneSettings;
