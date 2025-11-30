import ANRScanner from "@/components/visitor/ANRScanner";
import BottomNav from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";

const Visitor = () => {
  const { user } = useAuth();

  return (
    <>
      <ANRScanner />
      {user && <BottomNav />}
    </>
  );
};

export default Visitor;
