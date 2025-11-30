import { useState, useEffect } from "react";
import { X, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const InstallPrompt = () => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed before
    const wasDismissed = localStorage.getItem("pwa-install-dismissed");
    if (wasDismissed) {
      const dismissedTime = parseInt(wasDismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    }

    // Show prompt after 3 seconds if installable or iOS
    const timer = setTimeout(() => {
      if (!isInstalled && (isInstallable || isIOS) && !dismissed) {
        setShowPrompt(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled, isIOS, dismissed]);

  const handleInstall = async () => {
    if (isIOS) {
      // Can't auto-install on iOS, just show instructions
      return;
    }
    
    const installed = await promptInstall();
    if (installed) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  if (!showPrompt || isInstalled) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 animate-in slide-in-from-bottom-4">
      <div className="glass-effect rounded-2xl p-4 border border-primary/20 shadow-lg">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Download className="w-6 h-6 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground mb-1">
              Installer ANR
            </h3>
            
            {isIOS ? (
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">
                  Pour installer, appuyez sur{" "}
                  <Share className="w-4 h-4 inline-block mx-1" />
                  puis "Sur l'écran d'accueil"
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-3">
                Installez l'app pour recevoir les appels même en arrière-plan
              </p>
            )}

            {!isIOS && (
              <Button
                variant="hero"
                size="sm"
                onClick={handleInstall}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Installer maintenant
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
