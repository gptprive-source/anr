import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useFeatureFlags, FeatureFlags } from "@/hooks/useFeatureFlags";

interface FeatureFlagRouteProps {
  flagKey: keyof FeatureFlags;
  children: React.ReactNode;
  redirectTo?: string;
}

const FeatureFlagRoute = ({ flagKey, children, redirectTo = "/dashboard" }: FeatureFlagRouteProps) => {
  const { flags, loading } = useFeatureFlags();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!flags[flagKey]) {
    return <Navigate to={redirectTo} replace />;
  }
  
  return <>{children}</>;
};

export default FeatureFlagRoute;
