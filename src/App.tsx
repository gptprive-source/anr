import { Toaster } from "@/components/ui/toaster";
import { lazy } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { IncomingCallProvider } from "@/contexts/IncomingCallContext";
import { SupportChatProvider } from "@/contexts/SupportChatContext";
import { SupportAlertProvider } from "@/contexts/SupportAlertContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import FeatureFlagRoute from "@/components/auth/FeatureFlagRoute";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import GlobalIncomingCallListener from "@/components/call/GlobalIncomingCallListener";
import UnifiedAssistant from "@/components/assistant/UnifiedAssistant";
import { SupportAlertOverlay } from "@/components/admin/SupportAlertOverlay";
import { useAudioUnlock } from "@/hooks/useAudioUnlock";
import ScrollToTop from "@/components/ScrollToTop";
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

import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
import Contacts from "./pages/Contacts";
import DoorAccess from "./pages/DoorAccess";
import EmployeeScan from "./pages/EmployeeScan";
import ProDashboard from "./pages/pro/ProDashboard";
import ProRegistrationSuccess from "./pages/pro/ProRegistrationSuccess";
import FAQ from "./pages/FAQ";
import CGU from "./pages/CGU";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import NoHabitation from "./pages/NoHabitation";
import Shop from "./pages/Shop";
import ShopSuccess from "./pages/ShopSuccess";
import Orders from "./pages/Orders";
import Referral from "./pages/Referral";
import RegistrationSuccess from "./pages/RegistrationSuccess";
import NotFound from "./pages/NotFound";
import PhoneVerification from "./pages/PhoneVerification";
import RingtoneSettings from "./pages/RingtoneSettings";
import OnboardingBusinessCard from "./pages/OnboardingBusinessCard";
import VisitorLogin from "./pages/VisitorLogin";
import VisitorCard from "./pages/VisitorCard";
import DeviceAuth from "./pages/DeviceAuth";

// Relay pages
import RelayDashboard from "./pages/relay/RelayDashboard";
import RelayRegistration from "./pages/relay/RelayRegistration";
import RelayContract from "./pages/relay/Contract";
import RelayTraining from "./pages/relay/Training";
import RelayEarnings from "./pages/relay/Earnings";
import ParcelScan from "./pages/relay/ParcelScan";

// Carrier pages
import CarrierDashboard from "./pages/carrier/CarrierDashboard";
import CarrierRegistration from "./pages/carrier/CarrierRegistration";
import CarrierLogin from "./pages/carrier/CarrierLogin";
import DeliveryScan from "./pages/carrier/DeliveryScan";
import ParcelReceive from "./pages/ParcelReceive";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminAllOrders from "./pages/admin/AllOrders";
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
import AdminReferrals from "./pages/admin/Referrals";
import AdminCommunications from "./pages/admin/Communications";
import AdminConversation from "./pages/admin/AdminConversation";
import AdminRelayManagement from "./pages/admin/RelayManagement";
import AdminParcels from "./pages/admin/Parcels";
import AdminDocuments from "./pages/admin/Documents";
import AdminEmailVariables from "./pages/admin/EmailVariables";
const queryClient = new QueryClient();
const AppContent = () => {
  useAudioUnlock();
  console.log("[APP] 🚀 AppContent rendering");
  return <>
      <Toaster />
      <Sonner />
      <InstallPrompt />
      <BrowserRouter>
        <ScrollToTop />
        

        <SupportAlertOverlay />
        <GlobalIncomingCallListener />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/visitor" element={<Visitor />} />
          <Route path="/anr/:code" element={<ANRLanding />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute>
                <Account />
              </ProtectedRoute>} />
          <Route path="/account/ringtone" element={<ProtectedRoute>
                <RingtoneSettings />
              </ProtectedRoute>} />
          <Route path="/call/:anrId" element={<Call />} />
          <Route path="/multi-habitat/:anrId" element={<MultiHabitat />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/invitation" element={<Invitation />} />
          <Route path="/registration-success" element={<RegistrationSuccess />} />
          <Route path="/phone-verification" element={<ProtectedRoute skipPhoneCheck><PhoneVerification /></ProtectedRoute>} />
          <Route path="/device-auth" element={<ProtectedRoute skipPhoneCheck><DeviceAuth /></ProtectedRoute>} />
          <Route path="/onboarding/business-card" element={<ProtectedRoute skipPhoneCheck><OnboardingBusinessCard /></ProtectedRoute>} />
          <Route path="/visitor-login" element={<VisitorLogin />} />
          <Route path="/visitor-card" element={<VisitorCard />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/update-gps" element={<ProtectedRoute>
                <UpdateGPS />
              </ProtectedRoute>} />
          <Route path="/residents" element={<ProtectedRoute>
                <Residents />
              </ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute>
                <Messages />
              </ProtectedRoute>} />
          <Route path="/chat/:recipientId" element={<ProtectedRoute>
                <Chat />
              </ProtectedRoute>} />
          <Route path="/contacts" element={<ProtectedRoute>
                <Contacts />
              </ProtectedRoute>} />
          <Route path="/door-access" element={<ProtectedRoute>
                <DoorAccess />
              </ProtectedRoute>} />
          <Route path="/employee-scan" element={<EmployeeScan />} />
          <Route path="/pro" element={<ProtectedRoute>
                <ProDashboard />
              </ProtectedRoute>} />
          <Route path="/pro/registration-success" element={<ProRegistrationSuccess />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/cgu" element={<CGU />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/shop" element={<ProtectedRoute>
                <Shop />
              </ProtectedRoute>} />
          <Route path="/shop-success" element={<ProtectedRoute>
                <ShopSuccess />
              </ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute>
                <Orders />
              </ProtectedRoute>} />
          <Route path="/referral" element={<ProtectedRoute>
                <FeatureFlagRoute flagKey="referralEnabled">
                  <Referral />
                </FeatureFlagRoute>
              </ProtectedRoute>} />
          <Route path="/no-habitation" element={<ProtectedRoute>
                <NoHabitation />
              </ProtectedRoute>} />
          
          {/* Relay Routes - protected by feature flag */}
          <Route path="/relay" element={<ProtectedRoute><FeatureFlagRoute flagKey="relayModuleEnabled"><RelayDashboard /></FeatureFlagRoute></ProtectedRoute>} />
          <Route path="/relay/register" element={<ProtectedRoute><FeatureFlagRoute flagKey="relayModuleEnabled"><RelayRegistration /></FeatureFlagRoute></ProtectedRoute>} />
          <Route path="/relay/contract" element={<ProtectedRoute><FeatureFlagRoute flagKey="relayModuleEnabled"><RelayContract /></FeatureFlagRoute></ProtectedRoute>} />
          <Route path="/relay/training" element={<ProtectedRoute><FeatureFlagRoute flagKey="relayModuleEnabled"><RelayTraining /></FeatureFlagRoute></ProtectedRoute>} />
          <Route path="/relay/earnings" element={<ProtectedRoute><FeatureFlagRoute flagKey="relayModuleEnabled"><RelayEarnings /></FeatureFlagRoute></ProtectedRoute>} />
          <Route path="/relay/scan" element={<ProtectedRoute><FeatureFlagRoute flagKey="relayModuleEnabled"><ParcelScan /></FeatureFlagRoute></ProtectedRoute>} />

          {/* Carrier Routes - protected by feature flag */}
          <Route path="/carrier" element={<FeatureFlagRoute flagKey="carrierModuleEnabled"><CarrierDashboard /></FeatureFlagRoute>} />
          <Route path="/carrier/dashboard" element={<FeatureFlagRoute flagKey="carrierModuleEnabled"><CarrierDashboard /></FeatureFlagRoute>} />
          <Route path="/carrier/register" element={<FeatureFlagRoute flagKey="carrierModuleEnabled"><CarrierRegistration /></FeatureFlagRoute>} />
          <Route path="/carrier/login" element={<FeatureFlagRoute flagKey="carrierModuleEnabled"><CarrierLogin /></FeatureFlagRoute>} />
          <Route path="/carrier/scan" element={<FeatureFlagRoute flagKey="carrierModuleEnabled"><DeliveryScan /></FeatureFlagRoute>} />
          <Route path="/parcel/receive" element={<FeatureFlagRoute flagKey="parcelDeliveryEnabled"><ParcelReceive /></FeatureFlagRoute>} />

          {/* Visitor messages - redirect old URL */}
          <Route path="/visitor-messages" element={<Messages />} />

          {/* Public legal pages */}
          <Route path="/mentions-legales" element={<MentionsLegales />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/orders" element={<AdminAllOrders />} />
          <Route path="/admin/anrs" element={<AdminANRs />} />
          <Route path="/admin/parcels" element={<AdminParcels />} />
          <Route path="/admin/config" element={<AdminConfig />} />
          <Route path="/admin/documents" element={<AdminDocuments />} />
          <Route path="/admin/email-variables" element={<AdminEmailVariables />} />
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
          <Route path="/admin/relay" element={<AdminRelayManagement />} />
          {/* RGPD Admin Routes */}
          <Route path="/admin/rgpd" element={<AdminRGPD />} />
          <Route path="/admin/rgpd/registry" element={<AdminRGPDRegistry />} />
          <Route path="/admin/rgpd/subprocessors" element={<AdminRGPDSubprocessors />} />
          <Route path="/admin/rgpd/requests" element={<AdminRGPDRequests />} />
          <Route path="/admin/rgpd/consents" element={<AdminRGPDConsents />} />
          <Route path="/admin/rgpd/incidents" element={<AdminRGPDIncidents />} />
          <Route path="/admin/referrals" element={<AdminReferrals />} />
          <Route path="/admin/communications" element={<AdminCommunications />} />
          <Route path="/admin/communications/conversation/:communicationId/:userId" element={<AdminConversation />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
        <UnifiedAssistant />
      </BrowserRouter>
    </>;
};
const App = () => <QueryClientProvider client={queryClient}>
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
  </QueryClientProvider>;
export default App;