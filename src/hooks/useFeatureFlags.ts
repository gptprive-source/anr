import { useAppConfig } from "./useAppConfig";

export interface FeatureFlags {
  // Plans
  planParticulierEnabled: boolean;
  planProEnabled: boolean;
  planEntrepriseEnabled: boolean;
  planCollectivitesEnabled: boolean;
  
  // Communication features
  voiceCallsEnabled: boolean;
  videoCallsEnabled: boolean;
  visitorTextMessagesEnabled: boolean;
  visitorVoiceMessagesEnabled: boolean;
  
  // Door features
  doorOpeningEnabled: boolean;
  scheduledAccessEnabled: boolean;
}

export const useFeatureFlags = () => {
  const { getConfig, isLoading: loading } = useAppConfig();

  const parseBoolean = (value: any): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true';
    return false;
  };

  const flags: FeatureFlags = {
    // Plans
    planParticulierEnabled: parseBoolean(getConfig('plan_particulier_enabled') ?? true),
    planProEnabled: parseBoolean(getConfig('plan_pro_enabled') ?? true),
    planEntrepriseEnabled: parseBoolean(getConfig('plan_entreprise_enabled') ?? false),
    planCollectivitesEnabled: parseBoolean(getConfig('plan_collectivites_enabled') ?? false),
    
    // Communication features
    voiceCallsEnabled: parseBoolean(getConfig('feature_voice_calls_enabled') ?? true),
    videoCallsEnabled: parseBoolean(getConfig('feature_video_calls_enabled') ?? true),
    visitorTextMessagesEnabled: parseBoolean(getConfig('feature_visitor_text_messages_enabled') ?? true),
    visitorVoiceMessagesEnabled: parseBoolean(getConfig('feature_visitor_voice_messages_enabled') ?? true),
    
    // Door features
    doorOpeningEnabled: parseBoolean(getConfig('feature_door_opening_enabled') ?? false),
    scheduledAccessEnabled: parseBoolean(getConfig('feature_scheduled_access_enabled') ?? false),
  };

  return { flags, loading };
};
