import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">ANR</span>
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            © 2024 ANR - Adresse Numérique Résidentielle. Système breveté.
          </p>
          
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Confidentialité</Link>
            <Link to="/cgu" className="hover:text-foreground transition-colors">CGU</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
