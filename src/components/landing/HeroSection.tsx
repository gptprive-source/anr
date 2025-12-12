import { Button } from "@/components/ui/button";
import { Smartphone, QrCode, Shield, LogIn, Download, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePWAInstall } from "@/hooks/usePWAInstall";
const HeroSection = () => {
  const navigate = useNavigate();
  const {
    isInstallable,
    isInstalled,
    promptInstall
  } = usePWAInstall();
  const handleInstall = async () => {
    await promptInstall();
  };
  return <section className="relative min-h-screen flex items-start justify-center overflow-hidden px-4 pt-6 pb-20">
      {/* Install button - top right */}
      {isInstallable && !isInstalled && (
        <div className="absolute top-6 right-6 z-20">
          <Button variant="outline" size="sm" onClick={handleInstall} className="gap-2">
            <Download className="w-4 h-4" />
            Installer
          </Button>
        </div>
      )}
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(199,89%,48%,0.1)_0%,_transparent_50%)]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-5xl mx-auto text-center">

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border mb-6 animate-fade-in" style={{
        animationDelay: "0.1s"
      }}>
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm text-muted-foreground">L'Adresse Numérique Résidentielle</span>
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in" style={{
        animationDelay: "0.2s"
      }}>
          Votre interphone
          <span className="gradient-text block mt-2">100% numérique</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{
        animationDelay: "0.3s"
      }}>
          ANR transforme votre smartphone en interphone intelligent. Recevez vos visiteurs en vidéo, où que vous soyez,
          sans installation matérielle.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6 animate-fade-in" style={{
        animationDelay: "0.4s"
      }}>
          <Button variant="hero" size="xl" onClick={() => navigate("/register")}>
            <Smartphone className="w-5 h-5" />
            J'active mon ANR
          </Button>
          <Button variant="glass" size="xl" onClick={() => navigate("/visitor")} className="!border-2 !border-blue-400 ring-4 ring-blue-400/40 shadow-[0_0_20px_rgba(96,165,250,0.4)]">
            <QrCode className="w-5 h-5" />
            J'appelle un résident
          </Button>
        </div>

        <div className="flex justify-center mb-16 animate-fade-in" style={{ animationDelay: "0.45s" }}>
          <Button variant="ghost" size="lg" onClick={() => navigate("/login")} className="gap-2">
            <LogIn className="w-5 h-5" />
            Se connecter
          </Button>
        </div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-4 gap-4 animate-fade-in" style={{
        animationDelay: "0.5s"
      }}>
          <FeatureCard icon={<QrCode className="w-6 h-6" />} title="QR Code & NFC" description="Scannez ou approchez votre téléphone pour sonner instantanément" color="blue" />
          <FeatureCard icon={<Smartphone className="w-6 h-6" />} title="Vidéo HD" description="Voyez votre visiteur avant de répondre, où que vous soyez" color="orange" />
          <FeatureCard icon={<MessageSquare className="w-6 h-6" />} title="Messagerie" description="Échangez des messages chiffrés avec vos visiteurs, texte et vocal" color="purple" />
          <FeatureCard icon={<Shield className="w-6 h-6" />} title="Sécurisé" description="Validation GPS et cryptographie avancée pour votre sécurité" color="green" />
        </div>
      </div>
    </section>;
};
const FeatureCard = ({
  icon,
  title,
  description,
  color = "blue"
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color?: "blue" | "orange" | "yellow" | "green" | "purple" | "cyan" | "rose";
}) => {
  const colorStyles = {
    blue: { borderColor: "#3b82f6", bg: "bg-blue-500/10", text: "text-blue-500" },
    orange: { borderColor: "#f97316", bg: "bg-orange-500/10", text: "text-orange-500" },
    yellow: { borderColor: "#eab308", bg: "bg-yellow-500/10", text: "text-yellow-500" },
    green: { borderColor: "#22c55e", bg: "bg-green-500/10", text: "text-green-500" },
    purple: { borderColor: "#a855f7", bg: "bg-purple-500/10", text: "text-purple-500" },
    cyan: { borderColor: "#06b6d4", bg: "bg-cyan-500/10", text: "text-cyan-500" },
    rose: { borderColor: "#f43f5e", bg: "bg-rose-500/10", text: "text-rose-500" },
  };
  const c = colorStyles[color];
  
  return (
    <div 
      className="bg-card/80 backdrop-blur-xl rounded-2xl p-6 card-shadow transition-colors text-center"
      style={{ border: `1px solid ${c.borderColor}` }}
    >
      <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center ${c.text} mb-4 mx-auto`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
};
export default HeroSection;