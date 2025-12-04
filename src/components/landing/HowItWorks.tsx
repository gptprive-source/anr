import { QrCode, Bell, Video, DoorOpen, HelpCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: <QrCode className="w-8 h-8" />,
    title: "Le visiteur scanne",
    description: "QR code, puce NFC ou numéro d'identification - 3 façons d'accéder à votre interphone",
  },
  {
    icon: <Bell className="w-8 h-8" />,
    title: "Vous êtes alerté",
    description: "Notification instantanée sur les téléphones de tous les résidents enregistrés",
  },
  {
    icon: <Video className="w-8 h-8" />,
    title: "Vidéo en direct",
    description: "Voyez votre visiteur avant de décrocher, passez en visio bidirectionnelle si souhaité",
  },
  {
    icon: <DoorOpen className="w-8 h-8" />,
    title: "Communiquez",
    description: "Parlez avec votre visiteur, transférez l'appel ou créez une conférence avec les autres résidents",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24 px-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_hsl(172,66%,50%,0.05)_0%,_transparent_50%)]" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Comment ça <span className="gradient-text">fonctionne</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Un système simple et intuitif pour révolutionner la façon dont vous accueillez vos visiteurs
          </p>
        </div>
        
        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-primary/50 to-accent/50" />
              )}
              
              <div className="relative flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-border flex items-center justify-center text-primary mb-6 relative z-10">
                  {step.icon}
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section - Prominent */}
        <div className="mt-20">
          <Link to="/faq" className="block">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 border border-primary/20 p-8 md:p-12 hover:border-primary/40 transition-all group">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                  <HelpCircle className="w-10 h-10 md:w-12 md:h-12 text-primary-foreground" />
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl md:text-3xl font-bold mb-2">
                    Des questions ?
                  </h3>
                  <p className="text-muted-foreground text-lg">
                    Consultez notre FAQ complète pour tout savoir sur l'ANR, l'interphone numérique, les abonnements, le déménagement et bien plus.
                  </p>
                </div>
                
                <Button size="lg" className="gap-2 group-hover:gap-3 transition-all">
                  Voir la FAQ
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
