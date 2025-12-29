import { QrCode, Video, MessageSquare, HelpCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
const steps = [{
  icon: <QrCode className="w-8 h-8" />,
  title: "Scanner",
  description: "Le visiteur scanne votre QR code ou badge NFC avec son téléphone",
  color: "blue"
}, {
  icon: <Video className="w-8 h-8" />,
  title: "Répondre",
  description: "Votre téléphone sonne et vous voyez le visiteur en vidéo HD",
  color: "orange"
}, {
  icon: <MessageSquare className="w-8 h-8" />,
  title: "Échanger",
  description: "Parlez et envoyez des messages chiffrés, texte ou vocal",
  color: "green"
}];
const colorStyles = {
  blue: "border-blue-500 text-blue-500 bg-blue-500/10",
  orange: "border-orange-500 text-orange-500 bg-orange-500/10",
  green: "border-green-500 text-green-500 bg-green-500/10"
};
const HowItWorks = () => {
  return <section className="py-20 px-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_hsl(172,66%,50%,0.05)_0%,_transparent_50%)]" />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="md:text-4xl mb-4 font-extrabold font-sans text-4xl">
            Comment ça <span className="gradient-text">fonctionne</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Simple, rapide et sécurisé
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((step, index) => <div key={index} className="relative flex flex-col items-center text-center animate-fade-in" style={{
          animationDelay: `${index * 0.1}s`
        }}>
              <div className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl border-2 ${colorStyles[step.color as keyof typeof colorStyles]} flex items-center justify-center mb-6 relative`}>
                {step.icon}
                <span className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-lg">
                  {index + 1}
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>)}
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <Link to="/faq" className="block">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 border border-primary/20 p-8 md:p-10 hover:border-primary/40 transition-all group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

              <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                  <HelpCircle className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground" />
                </div>

                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl md:text-2xl font-bold mb-2">Des questions ?</h3>
                  <p className="text-muted-foreground">
                    Consultez notre FAQ pour tout savoir sur l'ANR
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
    </section>;
};
export default HowItWorks;