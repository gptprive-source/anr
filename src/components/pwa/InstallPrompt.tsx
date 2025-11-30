import { useState, useEffect } from "react";
import { X, Download, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const InstallPrompt = () => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed before (only for 24h now instead of 7 days)
    const wasDismissed = localStorage.getItem("pwa-install-dismissed");
    if (wasDismissed) {
      const dismissedTime = parseInt(wasDismissed, 10);
      // Show again after 24 hours
      if (Date.now() - dismissedTime < 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      } else {
        // Clear old dismissal
        localStorage.removeItem("pwa-install-dismissed");
      }
    }

    // Show prompt immediately if installable or iOS
    if (!isInstalled && (isInstallable || isIOS) && !dismissed) {
      setShowPrompt(true);
    }
  }, [isInstallable, isInstalled, isIOS, dismissed]);

  const handleInstall = async () => {
    if (isIOS) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="mx-4 w-full max-w-md glass-effect rounded-3xl p-6 border border-primary/30 shadow-2xl">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary/50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-10 h-10 text-primary" />
          </div>
          
          <h2 className="text-xl font-bold text-foreground mb-2">
            Installer ANR
          </h2>
          
          <p className="text-muted-foreground mb-6">
            Installez l'application pour recevoir les appels interphone même quand votre navigateur est fermé
          </p>
          
          {isIOS ? (
            <div className="bg-secondary/50 rounded-xl p-4 mb-4">
              <p className="text-sm text-muted-foreground">
                Appuyez sur{" "}
                <Share className="w-4 h-4 inline-block mx-1 text-primary" />
                <span className="font-medium text-foreground">Partager</span>
                {" "}puis{" "}
                <span className="font-medium text-foreground">"Sur l'écran d'accueil"</span>
              </p>
            </div>
          ) : (
            <Button
              variant="hero"
              size="lg"
              onClick={handleInstall}
              className="w-full mb-3"
            >
              <Download className="w-5 h-5 mr-2" />
              Installer maintenant
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-muted-foreground"
          >
            Plus tard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
