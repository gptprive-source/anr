import { Bell, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useRingtoneSettings } from '@/hooks/useRingtoneSettings';

export const RingtoneSettingsCard = () => {
  const navigate = useNavigate();
  const { ringtones, selectedRingtone, loading } = useRingtoneSettings();
  
  const currentRingtone = ringtones.find(r => r.uri === selectedRingtone);
  const ringtoneName = currentRingtone?.title || 'Par défaut';

  return (
    <Card 
      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => navigate('/account/ringtone')}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground">Sonnerie d'appel</p>
          <p className="text-sm text-muted-foreground truncate">
            {loading ? 'Chargement...' : ringtoneName}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
      </div>
    </Card>
  );
};
