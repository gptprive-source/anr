import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipPhoneCheck?: boolean;
}

// TEMPORARY: Phone verification disabled until app launch
const ProtectedRoute = ({ children, skipPhoneCheck = true }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checkingPhone, setCheckingPhone] = useState(!skipPhoneCheck);
  const [needsPhoneVerification, setNeedsPhoneVerification] = useState(false);

  // Reset states when user changes
  useEffect(() => {
    console.log("[ProtectedRoute] User changed, resetting states:", { userId: user?.id, skipPhoneCheck });
    setCheckingPhone(!skipPhoneCheck);
    setNeedsPhoneVerification(false);
  }, [user?.id, skipPhoneCheck]);

  // Check phone verification after states are reset
  useEffect(() => {
    const checkPhoneVerification = async () => {
      if (!user || skipPhoneCheck) {
        console.log("[ProtectedRoute] Skipping phone check:", { user: !!user, skipPhoneCheck });
        setCheckingPhone(false);
        return;
      }

      try {
        const localDeviceId = localStorage.getItem("anr_device_id");
        console.log("[ProtectedRoute] Checking phone verification for user:", user.id, "localDeviceId:", localDeviceId);
        
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("phone_verified, device_id")
          .eq("id", user.id)
          .maybeSingle();

        console.log("[ProtectedRoute] Profile data:", profile, "Error:", error);

        if (error) {
          console.error("[ProtectedRoute] Error fetching profile:", error);
          setCheckingPhone(false);
          return;
        }

        // If profile has a device_id and it doesn't match local, this is unauthorized
        if (profile?.device_id && localDeviceId && profile.device_id !== localDeviceId) {
          console.warn("[ProtectedRoute] Device mismatch detected, signing out");
          await supabase.auth.signOut();
          return;
        }

        // Check if phone verification is needed
        const needsVerification = !profile?.phone_verified || !profile?.device_id;
        console.log("[ProtectedRoute] Needs phone verification:", needsVerification, {
          phone_verified: profile?.phone_verified,
          device_id: profile?.device_id
        });
        
        // Always update the state (not just when true)
        setNeedsPhoneVerification(needsVerification);
      } catch (err) {
        console.error("[ProtectedRoute] Exception:", err);
      } finally {
        setCheckingPhone(false);
      }
    };

    if (!loading && user) {
      checkPhoneVerification();
    } else if (!loading && !user) {
      setCheckingPhone(false);
    }
  }, [user, loading, skipPhoneCheck]);

  // Log render state for debugging
  console.log("[ProtectedRoute] Render state:", {
    loading,
    checkingPhone,
    user: !!user,
    userId: user?.id,
    needsPhoneVerification,
    skipPhoneCheck,
    pathname: location.pathname
  });

  // Always show loader while auth state is being determined
  if (loading || checkingPhone) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only redirect to login if we're sure there's no user
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to phone verification if needed
  if (needsPhoneVerification && !skipPhoneCheck) {
    console.log("[ProtectedRoute] Redirecting to phone verification");
    return <Navigate to="/phone-verification" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
