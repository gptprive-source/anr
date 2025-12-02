import MultiHabitatSelector from "@/components/call/MultiHabitatSelector";
import BottomNav from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";

const MultiHabitat = () => {
  const { user } = useAuth();

  return (
    <>
      <MultiHabitatSelector />
      {user && <BottomNav />}
    </>
  );
};

export default MultiHabitat;
