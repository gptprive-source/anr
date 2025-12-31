import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import RingtonePlugin, { Ringtone } from '@/plugins/RingtonePlugin';

export const useRingtoneSettings = () => {
  const { user } = useAuth();
  const [ringtones, setRingtones] = useState<Ringtone[]>([]);
  const [selectedRingtone, setSelectedRingtone] = useState<string>('default');
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load available ringtones
  useEffect(() => {
    const loadRingtones = async () => {
      try {
        const { ringtones: deviceRingtones } = await RingtonePlugin.getRingtones();
        setRingtones(deviceRingtones);
        console.log('[Ringtone] Loaded', deviceRingtones.length, 'ringtones');
      } catch (error) {
        console.error('[Ringtone] Error loading ringtones:', error);
        // Fallback to default
        setRingtones([{ id: 'default', title: 'Sonnerie par défaut', uri: 'default' }]);
      }
    };
    
    loadRingtones();
  }, []);

  // Load user's saved preference
  useEffect(() => {
    const loadPreference = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        // Use any to access the new column before types are regenerated
        const ringtoneUri = (data as any)?.ringtone_uri;
        if (ringtoneUri) {
          setSelectedRingtone(ringtoneUri);
        }
      } catch (error) {
        console.error('[Ringtone] Error loading preference:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadPreference();
  }, [user]);

  // Save ringtone preference
  const saveRingtone = useCallback(async (uri: string) => {
    if (!user) return;
    
    try {
      // Use raw update to avoid type issues with new column
      const { error } = await supabase
        .from('profiles')
        .update({ ringtone_uri: uri } as any)
        .eq('id', user.id);
      
      if (error) throw error;
      
      setSelectedRingtone(uri);
      console.log('[Ringtone] Saved preference:', uri);
    } catch (error) {
      console.error('[Ringtone] Error saving preference:', error);
      throw error;
    }
  }, [user]);

  // Preview a ringtone
  const previewRingtone = useCallback(async (uri: string) => {
    try {
      setIsPlaying(true);
      await RingtonePlugin.playRingtone({ uri });
      
      // Auto-stop after 3 seconds
      setTimeout(async () => {
        await RingtonePlugin.stopRingtone();
        setIsPlaying(false);
      }, 3000);
    } catch (error) {
      console.error('[Ringtone] Error playing preview:', error);
      setIsPlaying(false);
    }
  }, []);

  // Stop preview
  const stopPreview = useCallback(async () => {
    try {
      await RingtonePlugin.stopRingtone();
      setIsPlaying(false);
    } catch (error) {
      console.error('[Ringtone] Error stopping preview:', error);
    }
  }, []);

  // Open native ringtone picker (Android only)
  const openNativePicker = useCallback(async () => {
    if (Capacitor.getPlatform() !== 'android') {
      console.log('[Ringtone] Native picker only available on Android');
      return null;
    }
    
    try {
      const { ringtone } = await RingtonePlugin.pickRingtone();
      if (ringtone) {
        await saveRingtone(ringtone.uri);
        return ringtone;
      }
      return null;
    } catch (error) {
      console.error('[Ringtone] Error opening picker:', error);
      return null;
    }
  }, [saveRingtone]);

  return {
    ringtones,
    selectedRingtone,
    loading,
    isPlaying,
    saveRingtone,
    previewRingtone,
    stopPreview,
    openNativePicker,
    isNative: Capacitor.isNativePlatform(),
  };
};
