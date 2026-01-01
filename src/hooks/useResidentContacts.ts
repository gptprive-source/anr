import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ResidentContact {
  id: string;
  user_id: string;
  contact_type: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  job_title: string | null;
  phone: string | null;
  email: string | null;
  anr_code: string | null;
  avatar_url: string | null;
  notes: string | null;
  source_business_card_id: string | null;
  source_message_id: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  // New fields for visitor-added contacts
  contact_user_id: string | null;
  habitation_id: string | null;
}

interface BusinessCard {
  id?: string;
  card_type: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  job_title: string | null;
  phone: string | null;
  email: string | null;
  avatar_url?: string | null;
  // New fields for visitor-added contacts
  contact_user_id?: string | null;
  habitation_id?: string | null;
}

export const useResidentContacts = () => {
  const [contacts, setContacts] = useState<ResidentContact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await (supabase
        .from("resident_contacts" as any)
        .select("*")
        .eq("user_id", userData.user.id)
        .order("is_favorite", { ascending: false })
        .order("created_at", { ascending: false }) as any);
      
      if (error) throw error;
      setContacts((data || []) as ResidentContact[]);
    } catch (error) {
      console.error("[useResidentContacts] Error fetching contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const addContact = async (
    businessCard: BusinessCard,
    notes?: string,
    sourceMessageId?: string
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Non authentifié");

      // Check if contact already exists (by email or phone)
      const existingContact = contacts.find(c => 
        (businessCard.email && c.email === businessCard.email) ||
        (businessCard.phone && c.phone === businessCard.phone)
      );

      if (existingContact) {
        return { success: false, error: "Ce contact existe déjà", existing: existingContact };
      }

      const { data, error } = await (supabase
        .from("resident_contacts" as any)
        .insert({
          user_id: userData.user.id,
          contact_type: businessCard.card_type || 'individual',
          first_name: businessCard.first_name,
          last_name: businessCard.last_name,
          company_name: businessCard.company_name,
          job_title: businessCard.job_title,
          phone: businessCard.phone,
          email: businessCard.email,
          avatar_url: businessCard.avatar_url || null,
          notes: notes || null,
          source_business_card_id: businessCard.id || null,
          source_message_id: sourceMessageId || null,
          contact_user_id: businessCard.contact_user_id || null,
          habitation_id: businessCard.habitation_id || null,
        })
        .select()
        .single() as any);
      
      if (error) throw error;

      setContacts(prev => [data as ResidentContact, ...prev]);
      return { success: true, contact: data };
    } catch (error: any) {
      console.error("[useResidentContacts] Error adding contact:", error);
      return { success: false, error: error.message };
    }
  };

  const updateContact = async (contactId: string, updates: Partial<ResidentContact>) => {
    try {
      const { data, error } = await (supabase
        .from("resident_contacts" as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", contactId)
        .select()
        .single() as any);
      
      if (error) throw error;

      setContacts(prev => prev.map(c => c.id === contactId ? data as ResidentContact : c));
      return { success: true, contact: data };
    } catch (error: any) {
      console.error("[useResidentContacts] Error updating contact:", error);
      return { success: false, error: error.message };
    }
  };

  const deleteContact = async (contactId: string) => {
    try {
      const { error } = await (supabase
        .from("resident_contacts" as any)
        .delete()
        .eq("id", contactId) as any);
      
      if (error) throw error;

      setContacts(prev => prev.filter(c => c.id !== contactId));
      return { success: true };
    } catch (error: any) {
      console.error("[useResidentContacts] Error deleting contact:", error);
      return { success: false, error: error.message };
    }
  };

  const toggleFavorite = async (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return { success: false, error: "Contact non trouvé" };

    return updateContact(contactId, { is_favorite: !contact.is_favorite });
  };

  const checkIfExists = (email?: string | null, phone?: string | null): ResidentContact | undefined => {
    return contacts.find(c => 
      (email && c.email === email) ||
      (phone && c.phone === phone)
    );
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  return {
    contacts,
    loading,
    addContact,
    updateContact,
    deleteContact,
    toggleFavorite,
    checkIfExists,
    refetch: fetchContacts,
  };
};
