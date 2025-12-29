import { Lock, WrenchIcon, Users, Globe } from "lucide-react";

const trustBadges = [
  {
    icon: <Lock className="w-5 h-5" />,
    text: "Chiffrement de bout en bout",
  },
  {
    icon: <WrenchIcon className="w-5 h-5" />,
    text: "Aucune installation matérielle",
  },
  {
    icon: <Users className="w-5 h-5" />,
    text: "Multi-résidents inclus",
  },
  {
    icon: <Globe className="w-5 h-5" />,
    text: "Fonctionne partout",
  },
];

const TrustSection = () => {
  return (
    <section className="py-8 px-4 border-y border-border/50 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap justify-center gap-6 md:gap-12">
          {trustBadges.map((badge, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-muted-foreground animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <span className="text-primary">{badge.icon}</span>
              <span className="text-sm font-medium">{badge.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
