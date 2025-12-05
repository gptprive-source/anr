import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, User, Server, Mail, Scale } from "lucide-react";
import VisitorFooter from "@/components/layout/VisitorFooter";

const MentionsLegales = () => {
  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-3xl mx-auto p-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Scale className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Mentions Légales</h1>
          </div>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">
          {/* Éditeur */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Éditeur du site
            </h2>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p><strong>Raison sociale :</strong> ANR SAS</p>
              <p><strong>Forme juridique :</strong> Société par Actions Simplifiée</p>
              <p><strong>Capital social :</strong> [À compléter] euros</p>
              <p><strong>Siège social :</strong> [Adresse du siège social à compléter]</p>
              <p><strong>RCS :</strong> [Numéro RCS à compléter]</p>
              <p><strong>SIRET :</strong> [Numéro SIRET à compléter]</p>
              <p><strong>Numéro de TVA intracommunautaire :</strong> [À compléter]</p>
            </div>
          </section>

          {/* Directeur de publication */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Directeur de la publication
            </h2>
            <div className="bg-muted/50 rounded-lg p-4">
              <p><strong>Nom :</strong> [Nom du directeur de publication]</p>
              <p><strong>Qualité :</strong> Président / Directeur Général</p>
            </div>
          </section>

          {/* Hébergement */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              Hébergement
            </h2>
            <div className="bg-muted/50 rounded-lg p-4 space-y-4">
              <div>
                <p className="font-medium">Application web</p>
                <p>Lovable (https://lovable.dev)</p>
                <p className="text-muted-foreground">Hébergement frontend et déploiement</p>
              </div>
              <div>
                <p className="font-medium">Base de données et API</p>
                <p>Supabase Inc.</p>
                <p>970 Toa Payoh North #07-04, Singapore 318992</p>
                <p className="text-muted-foreground">Infrastructure backend (PostgreSQL, Auth, Edge Functions)</p>
              </div>
            </div>
          </section>

          {/* Contact DPO */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Délégué à la Protection des Données (DPO)
            </h2>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p>Pour toute question relative à la protection de vos données personnelles ou pour exercer vos droits, vous pouvez contacter notre DPO :</p>
              <p><strong>Email :</strong> dpo@anr.fr</p>
              <p><strong>Adresse :</strong> ANR SAS - DPO, [Adresse postale]</p>
              <p className="text-muted-foreground mt-2">
                Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression, de portabilité de vos données et d'un droit d'opposition au traitement.
              </p>
            </div>
          </section>

          {/* Propriété intellectuelle */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Propriété intellectuelle</h2>
            <p className="text-muted-foreground">
              L'ensemble du contenu de ce site (textes, images, logos, icônes, sons, logiciels, etc.) est la propriété exclusive d'ANR SAS ou de ses partenaires et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.
            </p>
            <p className="text-muted-foreground">
              Le concept d'Adresse Numérique Résidentielle (ANR) est protégé par un brevet. Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite sans autorisation écrite préalable d'ANR SAS.
            </p>
          </section>

          {/* Cookies */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Cookies et traceurs</h2>
            <p className="text-muted-foreground">
              Ce site utilise des cookies strictement nécessaires au fonctionnement du service (authentification, préférences). Aucun cookie publicitaire ou de traçage marketing n'est utilisé.
            </p>
            <p className="text-muted-foreground">
              Pour plus d'informations sur l'utilisation de vos données, consultez notre{" "}
              <Link to="/privacy" className="text-primary hover:underline">Politique de Confidentialité</Link>.
            </p>
          </section>

          {/* Liens utiles */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Liens utiles</h2>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <Link to="/privacy">Politique de Confidentialité</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/cgu">Conditions Générales d'Utilisation</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/contact">Nous contacter</Link>
              </Button>
            </div>
          </section>

          {/* Date */}
          <p className="text-xs text-muted-foreground pt-8 border-t">
            Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>
      <VisitorFooter />
    </div>
  );
};

export default MentionsLegales;