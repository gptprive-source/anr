import { Button } from "@/components/ui/button";
import { Smartphone, QrCode, Shield, LogIn, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoAnr from "@/assets/logo-anr.png";
import { usePWAInstall } from "@/hooks/usePWAInstall";
const HeroSection = () => {
  const navigate = useNavigate();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const handleInstall = async () => {
    await promptInstall();
  };
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-20">
      {/* Login button - top right */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        {isInstallable && !isInstalled && (
          <Button variant="outline" size="sm" onClick={handleInstall} className="gap-2">
            <Download className="w-4 h-4" />
            Installer
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="gap-2">
          <LogIn className="w-4 h-4" />
          Se connecter
        </Button>
      </div>
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(199,89%,48%,0.1)_0%,_transparent_50%)]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Large Logo */}
        <div className="mb-8 animate-fade-in">
          <img
            src={logoAnr}
            alt="ANR - Adresse Numérique Résidentielle"
            className="w-32 h-32 md:w-40 md:h-40 mx-auto object-contain drop-shadow-2xl"
          />
        </div>

        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border mb-6 animate-fade-in"
          style={{
            animationDelay: "0.1s",
          }}
        >
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm text-muted-foreground">Adresse Numérique Résidentielle système breveté</span>
        </div>

        <h1
          className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in"
          style={{
            animationDelay: "0.2s",
          }}
        >
          Votre interphone
          <span className="gradient-text block mt-2">100% numérique</span>
        </h1>

        <p
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in"
          style={{
            animationDelay: "0.3s",
          }}
        >
          ANR transforme votre smartphone en interphone intelligent. Recevez vos visiteurs en vidéo, où que vous soyez,
          sans installation matérielle.
        </p>

        <div
          className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in"
          style={{
            animationDelay: "0.4s",
          }}
        >
          <Button variant="hero" size="xl" onClick={() => navigate("/register")}>
            <Smartphone className="w-5 h-5" />
            J'active mon ANR
          </Button>
          <Button variant="glass" size="xl" onClick={() => navigate("/visitor")}>
            <QrCode className="w-5 h-5" />
            Je suis visiteur
          </Button>
        </div>

        {/* Feature cards */}
        <div
          className="grid md:grid-cols-3 gap-6 animate-fade-in"
          style={{
            animationDelay: "0.5s",
          }}
        >
          <FeatureCard
            icon={<QrCode className="w-6 h-6" />}
            title="QR Code & NFC"
            description="Scannez ou approchez votre téléphone pour sonner instantanément"
          />
          <FeatureCard
            icon={<Smartphone className="w-6 h-6" />}
            title="Vidéo HD"
            description="Voyez votre visiteur avant de répondre, où que vous soyez"
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Sécurisé"
            description="Validation GPS et cryptographie avancée pour votre sécurité"
          />
        </div>
      </div>
    </section>
  );
};
const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="glass-effect rounded-2xl p-6 card-shadow hover:border-primary/30 transition-colors text-center">
    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 mx-auto">
      {icon}
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm">{description}</p>
  </div>
);
export default HeroSection;
