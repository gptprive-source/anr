import ANRScanner from "@/components/visitor/ANRScanner";
import BottomNav from "@/components/layout/BottomNav";
import VisitorFooter from "@/components/layout/VisitorFooter";
import { useAuth } from "@/hooks/useAuth";

const Visitor = () => {
  const { user } = useAuth();

  return (
    <>
      <ANRScanner />
      {user ? <BottomNav /> : <VisitorFooter />}
    </>
  );
};

export default Visitor;
