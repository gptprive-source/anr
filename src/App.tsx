import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { IncomingCallProvider } from "@/contexts/IncomingCallContext";
import { SupportChatProvider } from "@/contexts/SupportChatContext";
import { SupportAlertProvider } from "@/contexts/SupportAlertContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import GlobalIncomingCallListener from "@/components/call/GlobalIncomingCallListener";
import SupportChat from "@/components/support/SupportChat";
import CoPilotChat from "@/components/copilot/CoPilotChat";
import { SupportAlertOverlay } from "@/components/admin/SupportAlertOverlay";
import { useAudioUnlock } from "@/hooks/useAudioUnlock";
import Index from "./pages/Index";
import Visitor from "./pages/Visitor";
import ANRLanding from "./pages/ANRLanding";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Account from "./pages/Account";
import Call from "./pages/Call";
import MultiHabitat from "./pages/MultiHabitat";
import VerifyEmail from "./pages/VerifyEmail";
import Invitation from "./pages/Invitation";
import ResetPassword from "./pages/ResetPassword";
import UpdateGPS from "./pages/UpdateGPS";
import Residents from "./pages/Residents";
import CallHistory from "./pages/CallHistory";
import Messages from "./pages/Messages";
import DoorAccess from "./pages/DoorAccess";
import EmployeeScan from "./pages/EmployeeScan";
import ProDashboard from "./pages/pro/ProDashboard";
import ProRegistrationSuccess from "./pages/pro/ProRegistrationSuccess";
import FAQ from "./pages/FAQ";
import CGU from "./pages/CGU";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import NoHabitation from "./pages/NoHabitation";
import NotFound from "./pages/NotFound";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminOrders from "./pages/admin/Orders";
import AdminANRs from "./pages/admin/ANRs";
import AdminConfig from "./pages/admin/Config";
import AdminFAQManager from "./pages/admin/FAQManager";
import AdminUsers from "./pages/admin/Users";
import AdminSubscriptions from "./pages/admin/Subscriptions";
import AdminTeam from "./pages/admin/Team";
import AdminAuditLog from "./pages/admin/AuditLog";
import AdminSupport from "./pages/admin/Support";
import AdminCGUEditor from "./pages/admin/CGUEditor";
import AdminPrivacyEditor from "./pages/admin/PrivacyEditor";
import AdminSecurity from "./pages/admin/Security";
import AdminChatbotStats from "./pages/admin/ChatbotStats";
import AdminChatbotCorrections from "./pages/admin/ChatbotCorrections";
import AdminMessages from "./pages/admin/Messages";
import MentionsLegales from "./pages/MentionsLegales";

// RGPD Admin pages
import AdminRGPD from "./pages/admin/RGPD";
import AdminRGPDRegistry from "./pages/admin/RGPDRegistry";
import AdminRGPDSubprocessors from "./pages/admin/RGPDSubprocessors";
import AdminRGPDRequests from "./pages/admin/RGPDRequests";
import AdminRGPDConsents from "./pages/admin/RGPDConsents";
import AdminRGPDIncidents from "./pages/admin/RGPDIncidents";
import AdminDailyUsage from "./pages/admin/DailyUsage";
import AdminDoorModules from "./pages/admin/DoorModules";

const queryClient = new QueryClient();

const AppContent = () => {
  useAudioUnlock();
  
  console.log("[APP] 🚀 AppContent rendering");
  
  return (
    <>
      <Toaster />
      <Sonner />
      <InstallPrompt />
      <SupportChat />
      <BrowserRouter>
        <CoPilotChat />
        <SupportAlertOverlay />
        <GlobalIncomingCallListener />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/visitor" element={<Visitor />} />
          <Route path="/anr/:code" element={<ANRLanding />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />
          <Route path="/call/:anrId" element={<Call />} />
          <Route path="/multi-habitat/:anrId" element={<MultiHabitat />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/invitation" element={<Invitation />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/update-gps"
            element={
              <ProtectedRoute>
                <UpdateGPS />
              </ProtectedRoute>
            }
          />
          <Route
            path="/residents"
            element={
              <ProtectedRoute>
                <Residents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/call-history"
            element={
              <ProtectedRoute>
                <CallHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/door-access"
            element={
              <ProtectedRoute>
                <DoorAccess />
              </ProtectedRoute>
            }
          />
          <Route path="/employee-scan" element={<EmployeeScan />} />
          <Route
            path="/pro"
            element={
              <ProtectedRoute>
                <ProDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/pro/registration-success" element={<ProRegistrationSuccess />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/cgu" element={<CGU />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />
          <Route
            path="/no-habitation"
            element={
              <ProtectedRoute>
                <NoHabitation />
              </ProtectedRoute>
            }
          />
          
          {/* Public legal pages */}
          <Route path="/mentions-legales" element={<MentionsLegales />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/anrs" element={<AdminANRs />} />
          <Route path="/admin/config" element={<AdminConfig />} />
          <Route path="/admin/faq" element={<AdminFAQManager />} />
          <Route path="/admin/cgu" element={<AdminCGUEditor />} />
          <Route path="/admin/privacy" element={<AdminPrivacyEditor />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
          <Route path="/admin/team" element={<AdminTeam />} />
          <Route path="/admin/audit" element={<AdminAuditLog />} />
          <Route path="/admin/support" element={<AdminSupport />} />
          <Route path="/admin/chatbot" element={<AdminChatbotStats />} />
          <Route path="/admin/chatbot-corrections" element={<AdminChatbotCorrections />} />
          <Route path="/admin/security" element={<AdminSecurity />} />
          <Route path="/admin/messages" element={<AdminMessages />} />
          <Route path="/admin/daily-usage" element={<AdminDailyUsage />} />
          <Route path="/admin/door-modules" element={<AdminDoorModules />} />
          {/* RGPD Admin Routes */}
          <Route path="/admin/rgpd" element={<AdminRGPD />} />
          <Route path="/admin/rgpd/registry" element={<AdminRGPDRegistry />} />
          <Route path="/admin/rgpd/subprocessors" element={<AdminRGPDSubprocessors />} />
          <Route path="/admin/rgpd/requests" element={<AdminRGPDRequests />} />
          <Route path="/admin/rgpd/consents" element={<AdminRGPDConsents />} />
          <Route path="/admin/rgpd/incidents" element={<AdminRGPDIncidents />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <IncomingCallProvider>
          <SupportChatProvider>
            <SupportAlertProvider>
              <AppContent />
            </SupportAlertProvider>
          </SupportChatProvider>
        </IncomingCallProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
