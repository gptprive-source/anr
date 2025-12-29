import { Button } from "@/components/ui/button";
import { Smartphone, QrCode, Shield, LogIn, Download, Truck, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import anrBadge from "@/assets/anr-badge.png";
const HeroSection = () => {
  const navigate = useNavigate();
  const {
    flags
  } = useFeatureFlags();
  const {
    isInstallable,
    isInstalled,
    promptInstall
  } = usePWAInstall();
  const handleInstall = async () => {
    await promptInstall();
  };
  return <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-12">
      {/* Install button - top right */}
      {isInstallable && !isInstalled && <div className="absolute top-6 right-6 z-20">
          <Button variant="outline" size="sm" onClick={handleInstall} className="gap-2">
            <Download className="w-4 h-4" />
            Installer
          </Button>
        </div>}

      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(199,89%,48%,0.1)_0%,_transparent_50%)]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center my-0 py-0">
          {/* Left column - Text content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border mb-6 animate-fade-in" style={{
            animationDelay: "0.1s"
          }}>
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">L'Adresse Numérique Résidentielle</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in" style={{
            animationDelay: "0.2s"
          }}>
              ​Votre interphone   
              <span className="gradient-text block mt-2">100% numérique</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 animate-fade-in" style={{
            animationDelay: "0.3s"
          }}>
              Transformez votre smartphone en interphone intelligent. Recevez vos visiteurs en vidéo, où que vous soyez.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6 animate-fade-in" style={{
            animationDelay: "0.4s"
          }}>
              <Button variant="glass" size="xl" onClick={() => navigate("/visitor")} className="!border-2 !border-blue-400 ring-4 ring-blue-400/40 shadow-[0_0_20px_rgba(96,165,250,0.4)]">
                <QrCode className="w-5 h-5" />
                J'appelle un résident
              </Button>
              <Button variant="hero" size="xl" onClick={() => navigate("/register")}>
                <Smartphone className="w-5 h-5" />
                Je m'abonne
              </Button>
            </div>

            <div className="flex justify-center lg:justify-start mb-8 animate-fade-in" style={{
            animationDelay: "0.45s"
          }}>
              <Button variant="ghost" size="lg" onClick={() => navigate("/login")} className="gap-2">
                <LogIn className="w-5 h-5" />
                Je me connecte
              </Button>
            </div>

            {/* Section Professionnels */}
            {flags.carrierModuleEnabled && <div className="animate-fade-in" style={{
            animationDelay: "0.5s"
          }}>
                <p className="text-sm text-muted-foreground mb-3">Vous êtes transporteur ou livreur ?</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                  <Button variant="outline" onClick={() => navigate("/carrier/login")} className="gap-2 border-orange-300 hover:bg-orange-50 hover:border-orange-400">
                    <Truck className="w-4 h-4 text-orange-500" />
                    Espace Transporteur
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/carrier/scan")} className="gap-2 border-teal-300 hover:bg-teal-50 hover:border-teal-400">
                    <Package className="w-4 h-4 text-teal-500" />
                    Scanner Livreur
                  </Button>
                </div>
              </div>}
          </div>

          {/* Right column - ANR Badge with animations */}
          <div className="relative flex items-center justify-center order-1 lg:order-2 animate-fade-in" style={{
          animationDelay: "0.3s"
        }}>
            {/* Animated rings behind the badge */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute w-64 h-64 md:w-80 md:h-80 rounded-full border-2 border-primary/20 animate-ping-slow" />
              <div className="absolute w-72 h-72 md:w-96 md:h-96 rounded-full border border-primary/10 animate-ping-slow" style={{
              animationDelay: "0.5s"
            }} />
              <div className="absolute w-80 h-80 md:w-[28rem] md:h-[28rem] rounded-full border border-primary/5 animate-ping-slow" style={{
              animationDelay: "1s"
            }} />
            </div>

            {/* Glow effect */}
            <div className="absolute w-48 h-48 md:w-64 md:h-64 bg-primary/30 rounded-full blur-3xl animate-glow-pulse" />

            {/* ANR Badge */}
            <div className="relative z-10 animate-float">
              <img alt="Badge ANR - Adresse Numérique Résidentielle" className="w-48 h-48 md:w-64 md:h-64 lg:w-72 lg:h-72 object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300" src="/lovable-uploads/b5164588-60c6-44b2-93ec-3b972843ed5a.png" />
            </div>

            {/* Floating label */}
            
          </div>
        </div>
      </div>
    </section>;
};
export default HeroSection;