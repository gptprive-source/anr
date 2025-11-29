import { useSearchParams } from "react-router-dom";
import CallInterface from "@/components/call/CallInterface";

const Call = () => {
  const [searchParams] = useSearchParams();
  const isResident = searchParams.get("resident") === "true";

  return (
    <CallInterface 
      isResident={isResident} 
      callerName={isResident ? "Visiteur" : "Jean Dupont"}
      anrAddress="12 Rue des Lilas, 75011 Paris"
    />
  );
};

export default Call;
