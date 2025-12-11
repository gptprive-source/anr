import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface VisitorCustomTemplate {
  id: string;
  device_id: string;
  name: string;
  content: string;
  icon: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// Get or create device ID (same as business cards)
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('visitor_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('visitor_device_id', deviceId);
  }
  return deviceId;
};

export const useVisitorCustomTemplates = () => {
  const [templates, setTemplates] = useState<VisitorCustomTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const deviceId = getDeviceId();

  const fetchTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('visitor_custom_templates')
        .select('*')
        .eq('device_id', deviceId)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setTemplates((data as VisitorCustomTemplate[]) || []);
    } catch (error) {
      console.error('Error fetching custom templates:', error);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const saveTemplate = async (name: string, content: string, icon: string = '📝') => {
    try {
      const { data, error } = await supabase
        .from('visitor_custom_templates')
        .insert({
          device_id: deviceId,
          name,
          content,
          icon
        })
        .select()
        .single();

      if (error) throw error;
      setTemplates(prev => [data as VisitorCustomTemplate, ...prev]);
      return data;
    } catch (error) {
      console.error('Error saving custom template:', error);
      throw error;
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('visitor_custom_templates')
        .delete()
        .eq('id', templateId)
        .eq('device_id', deviceId);

      if (error) throw error;
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (error) {
      console.error('Error deleting custom template:', error);
      throw error;
    }
  };

  const updateTemplate = async (templateId: string, name: string, content: string, icon: string) => {
    try {
      const { data, error } = await supabase
        .from('visitor_custom_templates')
        .update({ name, content, icon, updated_at: new Date().toISOString() })
        .eq('id', templateId)
        .eq('device_id', deviceId)
        .select()
        .single();

      if (error) throw error;
      setTemplates(prev => prev.map(t => t.id === templateId ? (data as VisitorCustomTemplate) : t));
      return data;
    } catch (error) {
      console.error('Error updating custom template:', error);
      throw error;
    }
  };

  const incrementUsage = async (templateId: string) => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) return;

      const { error } = await supabase
        .from('visitor_custom_templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', templateId)
        .eq('device_id', deviceId);

      if (error) throw error;
      
      setTemplates(prev => 
        prev.map(t => 
          t.id === templateId 
            ? { ...t, usage_count: t.usage_count + 1 } 
            : t
        ).sort((a, b) => b.usage_count - a.usage_count)
      );
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  };

  return {
    templates,
    loading,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    incrementUsage,
    refetch: fetchTemplates
  };
};
