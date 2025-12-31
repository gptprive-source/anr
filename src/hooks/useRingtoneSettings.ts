import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import RingtonePlugin, { Ringtone } from '@/plugins/RingtonePlugin';

export const useRingtoneSettings = () => {
  const { user } = useAuth();
  const [ringtones, setRingtones] = useState<Ringtone[]>([]);
  const [customRingtones, setCustomRingtones] = useState<Ringtone[]>([]);
  const [selectedRingtone, setSelectedRingtone] = useState<string>('default');
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Load available ringtones (preset + custom)
  useEffect(() => {
    const loadRingtones = async () => {
      try {
        const { ringtones: deviceRingtones } = await RingtonePlugin.getRingtones();
        setRingtones(deviceRingtones);
        console.log('[Ringtone] Loaded', deviceRingtones.length, 'preset ringtones');
      } catch (error) {
        console.error('[Ringtone] Error loading ringtones:', error);
        setRingtones([{ id: 'default', title: 'Sonnerie par défaut', uri: 'default' }]);
      }
    };
    
    loadRingtones();
  }, []);

  // Load user's custom uploaded ringtones
  useEffect(() => {
    const loadCustomRingtones = async () => {
      if (!user) return;
      
      try {
        const { data: files, error } = await supabase.storage
          .from('ringtones')
          .list(user.id, { limit: 20 });
        
        if (error) throw error;
        
        if (files && files.length > 0) {
          const customs: Ringtone[] = files
            .filter(f => f.name.match(/\.(mp3|wav|ogg|m4a)$/i))
            .map(f => {
              const { data: urlData } = supabase.storage
                .from('ringtones')
                .getPublicUrl(`${user.id}/${f.name}`);
              
              return {
                id: `custom-${f.id}`,
                title: f.name.replace(/\.[^/.]+$/, ''),
                uri: urlData.publicUrl,
                category: 'Mes sonneries',
              };
            });
          
          setCustomRingtones(customs);
          console.log('[Ringtone] Loaded', customs.length, 'custom ringtones');
        }
      } catch (error) {
        console.error('[Ringtone] Error loading custom ringtones:', error);
      }
    };
    
    loadCustomRingtones();
  }, [user]);

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

  // Upload custom ringtone
  const uploadRingtone = useCallback(async (file: File) => {
    if (!user) throw new Error('User not authenticated');
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('Le fichier est trop volumineux (max 5MB)');
    }
    
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Format non supporté. Utilisez MP3, WAV, OGG ou M4A.');
    }
    
    setUploading(true);
    
    try {
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('ringtones')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('ringtones')
        .getPublicUrl(filePath);
      
      const newRingtone: Ringtone = {
        id: `custom-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        uri: urlData.publicUrl,
        category: 'Mes sonneries',
      };
      
      setCustomRingtones(prev => [newRingtone, ...prev]);
      
      // Auto-select the new ringtone
      await saveRingtone(urlData.publicUrl);
      
      console.log('[Ringtone] Uploaded:', fileName);
      return newRingtone;
    } finally {
      setUploading(false);
    }
  }, [user, saveRingtone]);

  // Delete custom ringtone
  const deleteCustomRingtone = useCallback(async (uri: string) => {
    if (!user) return;
    
    try {
      // Extract path from URL
      const url = new URL(uri);
      const pathMatch = url.pathname.match(/\/ringtones\/(.+)$/);
      if (!pathMatch) return;
      
      const filePath = decodeURIComponent(pathMatch[1]);
      
      const { error } = await supabase.storage
        .from('ringtones')
        .remove([filePath]);
      
      if (error) throw error;
      
      setCustomRingtones(prev => prev.filter(r => r.uri !== uri));
      
      // If deleted ringtone was selected, switch to default
      if (selectedRingtone === uri) {
        await saveRingtone('default');
      }
      
      console.log('[Ringtone] Deleted:', filePath);
    } catch (error) {
      console.error('[Ringtone] Error deleting:', error);
      throw error;
    }
  }, [user, selectedRingtone, saveRingtone]);

  // Preview a ringtone (handles both preset and custom URLs)
  const previewRingtone = useCallback(async (uri: string) => {
    try {
      // Stop any existing playback
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      
      setIsPlaying(true);
      
      // Check if it's a custom URL (http/https)
      if (uri.startsWith('http')) {
        const audio = new Audio(uri);
        setAudioElement(audio);
        audio.play();
        
        // Auto-stop after 5 seconds
        setTimeout(() => {
          audio.pause();
          audio.currentTime = 0;
          setIsPlaying(false);
        }, 5000);
      } else {
        // Use plugin for preset ringtones
        await RingtonePlugin.playRingtone({ uri });
        
        setTimeout(async () => {
          await RingtonePlugin.stopRingtone();
          setIsPlaying(false);
        }, 3000);
      }
    } catch (error) {
      console.error('[Ringtone] Error playing preview:', error);
      setIsPlaying(false);
    }
  }, [audioElement]);

  // Stop preview
  const stopPreview = useCallback(async () => {
    try {
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      await RingtonePlugin.stopRingtone();
      setIsPlaying(false);
    } catch (error) {
      console.error('[Ringtone] Error stopping preview:', error);
    }
  }, [audioElement]);

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

  // Combine preset and custom ringtones
  const allRingtones = [...customRingtones, ...ringtones];

  return {
    ringtones: allRingtones,
    customRingtones,
    selectedRingtone,
    loading,
    isPlaying,
    uploading,
    saveRingtone,
    uploadRingtone,
    deleteCustomRingtone,
    previewRingtone,
    stopPreview,
    openNativePicker,
    isNative: Capacitor.isNativePlatform(),
  };
};
