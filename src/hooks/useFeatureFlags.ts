import { useMemo } from "react";
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
  
  // Relay module
  relayModuleEnabled: boolean;
}

export const useFeatureFlags = () => {
  const { configs, isLoading: loading } = useAppConfig();

  const flags = useMemo<FeatureFlags>(() => {
    const getConfig = (key: string): any => {
      const config = configs?.find(c => c.key === key);
      if (!config) return undefined;
      
      try {
        const value = typeof config.value === 'string' ? JSON.parse(config.value) : config.value;
        return value;
      } catch {
        return config.value;
      }
    };

    const parseBoolean = (value: any, defaultValue: boolean): boolean => {
      if (value === undefined || value === null) return defaultValue;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return value === 'true';
      return defaultValue;
    };

    return {
      // Plans - default true for particulier/pro, false for others
      planParticulierEnabled: parseBoolean(getConfig('plan_particulier_enabled'), true),
      planProEnabled: parseBoolean(getConfig('plan_pro_enabled'), true),
      planEntrepriseEnabled: parseBoolean(getConfig('plan_entreprise_enabled'), false),
      planCollectivitesEnabled: parseBoolean(getConfig('plan_collectivites_enabled'), false),
      
      // Communication features - default true
      voiceCallsEnabled: parseBoolean(getConfig('feature_voice_calls_enabled'), true),
      videoCallsEnabled: parseBoolean(getConfig('feature_video_calls_enabled'), true),
      visitorTextMessagesEnabled: parseBoolean(getConfig('feature_visitor_text_messages_enabled'), true),
      visitorVoiceMessagesEnabled: parseBoolean(getConfig('feature_visitor_voice_messages_enabled'), true),
      
      // Door features - default false
      doorOpeningEnabled: parseBoolean(getConfig('feature_door_opening_enabled'), false),
      scheduledAccessEnabled: parseBoolean(getConfig('feature_scheduled_access_enabled'), false),
      
      // Relay module - default false
      relayModuleEnabled: parseBoolean(getConfig('relay_module_enabled'), false),
    };
  }, [configs]);

  return { flags, loading };
};
