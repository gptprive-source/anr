// Utilitaire pour gérer les SMS natifs vs web

// Détecte si on est sur une app native Capacitor
export function isNativePlatform(): boolean {
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

// Détecte si on est sur Android
export function isAndroid(): boolean {
  return (window as any).Capacitor?.getPlatform?.() === 'android';
}

// Interface pour le plugin SMS natif (sera implémenté côté Android)
interface NativeSMSPlugin {
  sendSMS(options: { phoneNumber: string; message: string }): Promise<{ success: boolean }>;
  startSMSListener(options: { phoneNumber: string }): Promise<void>;
  stopSMSListener(): Promise<void>;
  addListener(event: 'smsReceived', callback: (data: { from: string; message: string }) => void): void;
  removeAllListeners(): void;
}

// Récupère le plugin natif s'il existe
function getNativeSMSPlugin(): NativeSMSPlugin | null {
  const Capacitor = (window as any).Capacitor;
  if (Capacitor?.Plugins?.NativeSMS) {
    return Capacitor.Plugins.NativeSMS as NativeSMSPlugin;
  }
  return null;
}

// Envoie un SMS de vérification
export async function sendVerificationSMS(phoneNumber: string): Promise<{
  success: boolean;
  method: 'native' | 'web';
  error?: string;
}> {
  const message = "ANR - Vérification de mon numéro";
  
  // Sur plateforme native, essayer d'envoyer automatiquement
  if (isNativePlatform()) {
    const plugin = getNativeSMSPlugin();
    if (plugin) {
      try {
        const result = await plugin.sendSMS({ phoneNumber, message });
        return { success: result.success, method: 'native' };
      } catch (error: any) {
        console.error('Native SMS error:', error);
        // Fallback vers méthode web
      }
    }
  }
  
  // Méthode web : ouvre l'app SMS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const separator = isIOS ? '&' : '?';
  const smsUri = `sms:${phoneNumber}${separator}body=${encodeURIComponent(message)}`;
  
  window.location.href = smsUri;
  
  return { success: true, method: 'web' };
}

// Démarre l'écoute des SMS entrants (natif uniquement)
export async function startListeningForSMS(
  phoneNumber: string,
  onReceived: () => void
): Promise<{ listening: boolean; cleanup: () => void }> {
  
  if (isNativePlatform()) {
    const plugin = getNativeSMSPlugin();
    if (plugin) {
      try {
        await plugin.startSMSListener({ phoneNumber });
        
        plugin.addListener('smsReceived', (data) => {
          // Vérifie que le SMS vient du bon numéro (soi-même)
          const normalizedFrom = data.from.replace(/[\s\-\(\)]/g, '');
          const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
          
          if (normalizedFrom.includes(normalizedPhone.slice(-9)) || 
              normalizedPhone.includes(normalizedFrom.slice(-9))) {
            onReceived();
          }
        });
        
        return {
          listening: true,
          cleanup: () => {
            plugin.stopSMSListener();
            plugin.removeAllListeners();
          }
        };
      } catch (error) {
        console.error('Failed to start SMS listener:', error);
      }
    }
  }
  
  // Sur web, pas d'écoute automatique possible
  return {
    listening: false,
    cleanup: () => {}
  };
}
