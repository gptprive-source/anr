import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import HeroSection from "@/components/landing/HeroSection";
import TrustSection from "@/components/landing/TrustSection";
import HowItWorks from "@/components/landing/HowItWorks";
import Footer from "@/components/landing/Footer";
import BottomNav from "@/components/layout/BottomNav";
const Index = () => {
  const {
    user,
    loading
  } = useAuth();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  return <main className="min-h-screen bg-background pb-20">
      <HeroSection />
      <TrustSection />
      <HowItWorks />
      <Footer />
      {user && <BottomNav />}
    </main>;
};
export default Index;