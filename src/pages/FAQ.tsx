import { Link } from "react-router-dom";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import VisitorFooter from "@/components/layout/VisitorFooter";

const FAQ = () => {
  const faqSections = [
    {
      title: "L'APPLICATION ANR",
      icon: "📱",
      questions: [
        {
          q: "Qu'est-ce que l'ANR ?",
          a: "L'Adresse Numérique Résidentielle (ANR) est une référence numérique brevetée attribuée gratuitement à chaque adresse postale en France. Elle se matérialise par un QR code, une puce NFC et un numéro d'identification unique. L'ANR est permanente et appartient à l'adresse, pas au résident."
        },
        {
          q: "Qu'est-ce que l'interphone numérique ANR ?",
          a: "C'est un service d'abonnement qui permet aux visiteurs d'appeler les résidents via l'ANR de leur habitation. Les visiteurs scannent le QR code ou la puce NFC, et les résidents reçoivent l'appel sur leur smartphone."
        },
        {
          q: "L'ANR est-elle gratuite ?",
          a: "Oui, l'ANR elle-même est totalement gratuite pour toutes les adresses. C'est l'abonnement à l'interphone numérique qui est payant (12€/an)."
        }
      ]
    },
    {
      title: "ABONNEMENT & PAIEMENT",
      icon: "💳",
      questions: [
        {
          q: "Combien coûte l'abonnement à l'interphone numérique ?",
          a: "L'abonnement coûte 12€/an (soit 1€/mois). Ce tarif inclut l'accès illimité à l'interphone numérique pour recevoir les appels des visiteurs."
        },
        {
          q: "Qu'est-ce qu'un Doming ?",
          a: "Le Doming est le badge physique qui affiche votre ANR (QR code + puce NFC + numéro). Il se colle sur votre boîte aux lettres ou portail pour permettre aux visiteurs d'accéder à votre interphone."
        },
        {
          q: "Le premier Doming est-il gratuit ?",
          a: "Oui, si votre habitation n'a pas encore d'ANR affiché, vous recevez gratuitement votre premier Doming lors de votre inscription. Les Domings supplémentaires coûtent 7€ chacun."
        },
        {
          q: "Mon abonnement est-il renouvelé automatiquement ?",
          a: "Oui, l'abonnement est reconduit tacitement chaque année. Vous pouvez annuler à tout moment depuis votre compte, et votre abonnement restera actif jusqu'à la fin de la période payée."
        },
        {
          q: "Comment annuler mon abonnement ?",
          a: "Rendez-vous dans votre compte > Gérer l'abonnement > Annuler. L'abonnement restera actif jusqu'à la date de fin de période."
        }
      ]
    },
    {
      title: "DÉMÉNAGEMENT",
      icon: "🏠",
      questions: [
        {
          q: "Que se passe-t-il si je déménage ?",
          a: "Votre abonnement vous suit ! Vous n'avez pas besoin de vous réabonner. Voici les étapes :\n1. Allez dans votre compte et modifiez votre adresse postale\n2. Rendez-vous à votre nouvelle habitation\n3. Scannez l'ANR de votre nouvelle adresse (si elle existe)\n4. Votre compte sera automatiquement lié à la nouvelle ANR"
        },
        {
          q: "Est-ce que j'emporte mon ANR quand je déménage ?",
          a: "Non, l'ANR est attachée à l'adresse postale, pas au résident. Elle reste à votre ancienne adresse pour les prochains occupants."
        },
        {
          q: "Ma nouvelle habitation n'a pas encore d'ANR, que faire ?",
          a: "L'application détectera automatiquement que votre nouvelle adresse n'a pas d'ANR affiché et vous enverra un Doming gratuitement."
        },
        {
          q: "Si je supprime mon compte et le recrée plus tard ?",
          a: "Si vous recréez un compte avec le même email, votre abonnement en cours sera automatiquement rattaché à votre nouveau compte. Pas besoin de repayer !"
        }
      ]
    },
    {
      title: "RÉSIDENTS & INVITÉS",
      icon: "👥",
      questions: [
        {
          q: "Combien de personnes peuvent recevoir les appels ?",
          a: "Jusqu'à 7 résidents peuvent être associés à une même habitation (1 propriétaire + 6 invités). Tous reçoivent les appels simultanément."
        },
        {
          q: "Comment inviter d'autres résidents ?",
          a: "Depuis votre tableau de bord, cliquez sur \"Inviter un résident\". L'invité recevra un email avec un lien valable 24h pour rejoindre votre habitation."
        },
        {
          q: "Les résidents invités doivent-ils payer ?",
          a: "Non, seul le propriétaire principal paie l'abonnement. Les résidents invités bénéficient gratuitement de l'interphone."
        },
        {
          q: "Que se passe-t-il si un résident invité déménage ?",
          a: "Le propriétaire peut retirer un résident invité à tout moment. L'invité peut également quitter l'habitation depuis son compte."
        }
      ]
    },
    {
      title: "UTILISATION DE L'INTERPHONE",
      icon: "📞",
      questions: [
        {
          q: "Comment un visiteur peut-il m'appeler ?",
          a: "Le visiteur a 3 options équivalentes :\n- Scanner le QR code avec son smartphone\n- Scanner la puce NFC\n- Saisir le numéro d'identification ANR"
        },
        {
          q: "Le visiteur doit-il avoir un compte ?",
          a: "Non, les visiteurs n'ont pas besoin de compte. Ils utilisent simplement leur navigateur web."
        },
        {
          q: "Y a-t-il une limite de distance pour appeler ?",
          a: "Oui, le visiteur doit se trouver à moins de 30 mètres de l'ANR pour pouvoir appeler. Cela empêche les appels frauduleux."
        },
        {
          q: "Puis-je voir le visiteur avant de répondre ?",
          a: "Oui ! Utilisez la fonction \"Aperçu\" (œil de bœuf) pour voir le visiteur en vidéo avant de décrocher."
        },
        {
          q: "Les appels ont-ils une durée maximale ?",
          a: "Oui, les appels sont limités à 2 minutes pour maintenir le service fluide."
        }
      ]
    },
    {
      title: "SÉCURITÉ & CONFIDENTIALITÉ",
      icon: "🔒",
      questions: [
        {
          q: "Le visiteur peut-il me voir en vidéo ?",
          a: "Non, jamais. L'interphone est unidirectionnel : vous voyez le visiteur, mais le visiteur ne vous voit pas."
        },
        {
          q: "Puis-je mettre l'interphone en mode silencieux ?",
          a: "Oui, activez le mode \"Sourdine\" depuis votre tableau de bord pour ne plus recevoir d'appels temporairement."
        },
        {
          q: "Mes données sont-elles sécurisées ?",
          a: "Oui, vos données sont chiffrées et stockées de manière sécurisée. Nous ne partageons jamais vos informations avec des tiers."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Questions fréquentes</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 pb-24">
        <div className="max-w-3xl mx-auto space-y-6">
          {faqSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span>{section.icon}</span>
                <span>{section.title}</span>
              </h2>
              <Accordion type="single" collapsible className="space-y-2">
                {section.questions.map((item, questionIndex) => (
                  <AccordionItem
                    key={questionIndex}
                    value={`${sectionIndex}-${questionIndex}`}
                    className="border border-border rounded-lg px-4 bg-card"
                  >
                    <AccordionTrigger className="text-left hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground whitespace-pre-line">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}

          {/* Contact section */}
          <div className="mt-8 p-6 bg-primary/10 rounded-lg text-center">
            <h3 className="font-semibold mb-2">Vous n'avez pas trouvé votre réponse ?</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Contactez notre support à l'adresse suivante :
            </p>
            <a
              href="mailto:support@anr.fr"
              className="text-primary font-medium hover:underline"
            >
              support@anr.fr
            </a>
          </div>
        </div>
      </main>

      <VisitorFooter />
    </div>
  );
};

export default FAQ;
