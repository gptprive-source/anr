import { Shield, HelpCircle, Lock, FileText, Mail } from "lucide-react";
import { Link } from "react-router-dom";
const Footer = () => {
  return <footer className="border-t border-border py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center border border-primary">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">ANR</span>
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            © 2024 ANR - Adresse Numérique Résidentielle. Système breveté.
          </p>
          
          <div className="flex gap-4 text-sm">
            <Link to="/faq" className="transition-colors flex items-center gap-1 text-black">
              <HelpCircle className="w-4 h-4" />
              FAQ
            </Link>
            <Link to="/privacy" className="transition-colors flex items-center gap-1 text-black">
              <Lock className="w-4 h-4" />
              Confidentialité
            </Link>
            <Link to="/cgu" className="transition-colors flex items-center gap-1 text-black">
              <FileText className="w-4 h-4" />
              CGU
            </Link>
            <Link to="/contact" className="transition-colors flex items-center gap-1 bg-[#380000]/0 text-black">
              <Mail className="w-4 h-4" />
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>;
};
export default Footer;