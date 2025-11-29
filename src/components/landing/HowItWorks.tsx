import { QrCode, Bell, Video, DoorOpen } from "lucide-react";

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
      </div>
    </section>
  );
};

export default HowItWorks;
