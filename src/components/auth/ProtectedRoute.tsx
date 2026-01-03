import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipPhoneCheck?: boolean;
}

const ProtectedRoute = ({ children, skipPhoneCheck = false }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checkingDevice, setCheckingDevice] = useState(!skipPhoneCheck);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  // Reset states when user changes
  useEffect(() => {
    console.log("[ProtectedRoute] User changed, resetting states:", { userId: user?.id, skipPhoneCheck });
    setCheckingDevice(!skipPhoneCheck);
    setRedirectTo(null);
  }, [user?.id, skipPhoneCheck]);

  // Get device name from user agent
  const getDeviceName = () => {
    const ua = navigator.userAgent;
    if (ua.includes("Windows")) return "Windows PC";
    if (ua.includes("Macintosh")) return "Mac";
    if (ua.includes("Linux")) return "Linux PC";
    if (ua.includes("iPhone")) return "iPhone";
    if (ua.includes("iPad")) return "iPad";
    if (ua.includes("Android")) return "Android";
    return "Appareil inconnu";
  };

  // Check device authorization
  useEffect(() => {
    const checkDeviceAuthorization = async () => {
      if (!user || skipPhoneCheck) {
        console.log("[ProtectedRoute] Skipping device check:", { user: !!user, skipPhoneCheck });
        setCheckingDevice(false);
        return;
      }

      try {
        // Get or create local device ID
        let localDeviceId = localStorage.getItem("anr_device_id");
        if (!localDeviceId) {
          localDeviceId = crypto.randomUUID();
          localStorage.setItem("anr_device_id", localDeviceId);
        }

        console.log("[ProtectedRoute] Checking device authorization for user:", user.id, "deviceId:", localDeviceId);

        // Check if this device is already authorized by device_id OR check if any device matches this browser
        let authorizedDevice = null;
        let deviceError = null;

        // First try with exact device_id match
        const { data: exactMatch, error: exactError } = await supabase
          .from("user_devices")
          .select("id, device_id, last_used_at")
          .eq("user_id", user.id)
          .eq("device_id", localDeviceId)
          .maybeSingle();

        if (exactError) {
          console.error("[ProtectedRoute] Error checking device:", exactError);
          setCheckingDevice(false);
          return;
        }

        authorizedDevice = exactMatch;

        // If no exact match, check if there's a device with matching device_name for this browser type
        // This handles the case where the device_id changed but the device was previously approved
        if (!authorizedDevice) {
          const deviceName = getDeviceName();
          const { data: nameMatch } = await supabase
            .from("user_devices")
            .select("id, device_id, last_used_at")
            .eq("user_id", user.id)
            .eq("device_name", deviceName)
            .order("last_used_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (nameMatch) {
            // Update localStorage to use the registered device_id
            console.log("[ProtectedRoute] Found device by name, syncing device_id:", nameMatch.device_id);
            localStorage.setItem("anr_device_id", nameMatch.device_id);
            authorizedDevice = nameMatch;
          }
        }

        if (authorizedDevice) {
          console.log("[ProtectedRoute] Device is authorized");
          // Update last_used_at
          await supabase
            .from("user_devices")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", authorizedDevice.id);
          
          setCheckingDevice(false);
          return;
        }

        // Device is not authorized - check if user has any authorized devices
        const { data: primaryDevice, error: primaryError } = await supabase
          .from("user_devices")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_primary", true)
          .maybeSingle();

        if (primaryError) {
          console.error("[ProtectedRoute] Error checking primary device:", primaryError);
          setCheckingDevice(false);
          return;
        }

        // Detect if this is a mobile device
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (primaryDevice) {
          if (isMobile) {
            // Mobile device without authorization → phone verification (not QR code)
            console.log("[ProtectedRoute] Mobile device, redirecting to phone verification");
            setRedirectTo("/phone-verification");
          } else {
            // Desktop device → show QR code for scanning
            console.log("[ProtectedRoute] Desktop device, redirecting to device auth");
            setRedirectTo("/device-auth");
          }
        } else {
          // No primary device - need phone verification first
          console.log("[ProtectedRoute] No primary device, redirecting to phone verification");
          setRedirectTo("/phone-verification");
        }
      } catch (err) {
        console.error("[ProtectedRoute] Exception:", err);
      } finally {
        setCheckingDevice(false);
      }
    };

    if (!loading && user) {
      checkDeviceAuthorization();
    } else if (!loading && !user) {
      setCheckingDevice(false);
    }
  }, [user, loading, skipPhoneCheck]);

  // Log render state for debugging
  console.log("[ProtectedRoute] Render state:", {
    loading,
    checkingDevice,
    user: !!user,
    userId: user?.id,
    redirectTo,
    skipPhoneCheck,
    pathname: location.pathname
  });

  // Always show loader while auth state is being determined
  if (loading || checkingDevice) {
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

  // Redirect to appropriate verification page if needed
  if (redirectTo && !skipPhoneCheck) {
    console.log("[ProtectedRoute] Redirecting to:", redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
