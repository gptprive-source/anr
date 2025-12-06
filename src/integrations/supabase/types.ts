export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      anrs: {
        Row: {
          address: string
          code: string
          created_at: string | null
          id: string
          latitude: number
          longitude: number
          max_gps_update_distance: number | null
          updated_at: string | null
        }
        Insert: {
          address: string
          code: string
          created_at?: string | null
          id?: string
          latitude: number
          longitude: number
          max_gps_update_distance?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          code?: string
          created_at?: string | null
          id?: string
          latitude?: number
          longitude?: number
          max_gps_update_distance?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      app_config: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          answered_at: string | null
          answered_by: string | null
          ended_at: string | null
          habitation_id: string
          id: string
          started_at: string | null
          status: string | null
          visitor_latitude: number | null
          visitor_longitude: number | null
          visitor_phone: string | null
        }
        Insert: {
          answered_at?: string | null
          answered_by?: string | null
          ended_at?: string | null
          habitation_id: string
          id?: string
          started_at?: string | null
          status?: string | null
          visitor_latitude?: number | null
          visitor_longitude?: number | null
          visitor_phone?: string | null
        }
        Update: {
          answered_at?: string | null
          answered_by?: string | null
          ended_at?: string | null
          habitation_id?: string
          id?: string
          started_at?: string | null
          status?: string | null
          visitor_latitude?: number | null
          visitor_longitude?: number | null
          visitor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_habitation_id_fkey"
            columns: ["habitation_id"]
            isOneToOne: false
            referencedRelation: "habitations"
            referencedColumns: ["id"]
          },
        ]
      }
      call_participants: {
        Row: {
          call_id: string
          created_at: string
          habitation_id: string
          id: string
          is_muted: boolean | null
          is_video_enabled: boolean | null
          joined_at: string | null
          left_at: string | null
          role: string
          status: string
          user_id: string | null
        }
        Insert: {
          call_id: string
          created_at?: string
          habitation_id: string
          id?: string
          is_muted?: boolean | null
          is_video_enabled?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          role?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          call_id?: string
          created_at?: string
          habitation_id?: string
          id?: string
          is_muted?: boolean | null
          is_video_enabled?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          role?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_participants_habitation_id_fkey"
            columns: ["habitation_id"]
            isOneToOne: false
            referencedRelation: "habitations"
            referencedColumns: ["id"]
          },
        ]
      }
      call_signals: {
        Row: {
          call_id: string
          created_at: string
          id: string
          sender_id: string
          signal_data: Json
          signal_type: string
        }
        Insert: {
          call_id: string
          created_at?: string
          id?: string
          sender_id: string
          signal_data: Json
          signal_type: string
        }
        Update: {
          call_id?: string
          created_at?: string
          id?: string
          sender_id?: string
          signal_data?: Json
          signal_type?: string
        }
        Relationships: []
      }
      chatbot_usage: {
        Row: {
          conversation_id: string | null
          created_at: string
          estimated_cost: number | null
          id: string
          input_tokens: number | null
          model: string | null
          output_tokens: number | null
          query_text: string | null
          response_preview: string | null
          source: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          estimated_cost?: number | null
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          query_text?: string | null
          response_preview?: string | null
          source: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          estimated_cost?: number | null
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          query_text?: string | null
          response_preview?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_usage_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          address: string | null
          anr_code: string | null
          assigned_to: string | null
          company_name: string | null
          created_at: string
          department: Database["public"]["Enums"]["contact_department"]
          email: string
          first_name: string
          id: string
          internal_notes: string | null
          last_name: string
          message: string
          phone: string | null
          read_at: string | null
          read_by: string | null
          resolved_at: string | null
          resolved_by: string | null
          sender_type: Database["public"]["Enums"]["sender_type"]
          status: Database["public"]["Enums"]["message_status"]
          subject: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          anr_code?: string | null
          assigned_to?: string | null
          company_name?: string | null
          created_at?: string
          department: Database["public"]["Enums"]["contact_department"]
          email: string
          first_name: string
          id?: string
          internal_notes?: string | null
          last_name: string
          message: string
          phone?: string | null
          read_at?: string | null
          read_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sender_type?: Database["public"]["Enums"]["sender_type"]
          status?: Database["public"]["Enums"]["message_status"]
          subject?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          anr_code?: string | null
          assigned_to?: string | null
          company_name?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["contact_department"]
          email?: string
          first_name?: string
          id?: string
          internal_notes?: string | null
          last_name?: string
          message?: string
          phone?: string | null
          read_at?: string | null
          read_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sender_type?: Database["public"]["Enums"]["sender_type"]
          status?: Database["public"]["Enums"]["message_status"]
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      doming_orders: {
        Row: {
          anr_id: string
          created_at: string | null
          id: string
          is_free: boolean | null
          quantity: number
          shipping_address: string | null
          status: string
          stripe_payment_intent_id: string | null
          total_price: number
          unit_price: number
          user_id: string
        }
        Insert: {
          anr_id: string
          created_at?: string | null
          id?: string
          is_free?: boolean | null
          quantity?: number
          shipping_address?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_price: number
          unit_price?: number
          user_id: string
        }
        Update: {
          anr_id?: string
          created_at?: string | null
          id?: string
          is_free?: boolean | null
          quantity?: number
          shipping_address?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_price?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doming_orders_anr_id_fkey"
            columns: ["anr_id"]
            isOneToOne: false
            referencedRelation: "anrs"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_items: {
        Row: {
          answer: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          question: string
          section: string
          section_icon: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          question: string
          section: string
          section_icon?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          question?: string
          section?: string
          section_icon?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      habitations: {
        Row: {
          anr_id: string
          created_at: string | null
          floor: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          anr_id: string
          created_at?: string | null
          floor?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          anr_id?: string
          created_at?: string | null
          floor?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "habitations_anr_id_fkey"
            columns: ["anr_id"]
            isOneToOne: false
            referencedRelation: "anrs"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_verifications: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          phone_number: string
          signature: string
          status: string | null
          user_id: string | null
          verification_code: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          phone_number: string
          signature: string
          status?: string | null
          user_id?: string | null
          verification_code: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          phone_number?: string
          signature?: string
          status?: string | null
          user_id?: string | null
          verification_code?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone_number: string | null
          phone_verified: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resident_invitations: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          first_name: string | null
          habitation_id: string
          id: string
          invited_by: string
          last_name: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          first_name?: string | null
          habitation_id: string
          id?: string
          invited_by: string
          last_name?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          first_name?: string | null
          habitation_id?: string
          id?: string
          invited_by?: string
          last_name?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resident_invitations_habitation_id_fkey"
            columns: ["habitation_id"]
            isOneToOne: false
            referencedRelation: "habitations"
            referencedColumns: ["id"]
          },
        ]
      }
      residents: {
        Row: {
          created_at: string | null
          habitation_id: string
          id: string
          is_muted: boolean | null
          is_owner: boolean | null
          status: Database["public"]["Enums"]["resident_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          habitation_id: string
          id?: string
          is_muted?: boolean | null
          is_owner?: boolean | null
          status?: Database["public"]["Enums"]["resident_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          habitation_id?: string
          id?: string
          is_muted?: boolean | null
          is_owner?: boolean | null
          status?: Database["public"]["Enums"]["resident_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "residents_habitation_id_fkey"
            columns: ["habitation_id"]
            isOneToOne: false
            referencedRelation: "habitations"
            referencedColumns: ["id"]
          },
        ]
      }
      rgpd_data_processing_registry: {
        Row: {
          created_at: string | null
          created_by: string | null
          data_categories: string[]
          id: string
          is_active: boolean | null
          legal_basis: string
          name: string
          purpose: string
          recipients: string[]
          retention_period: string
          third_country_transfer: boolean | null
          transfer_safeguards: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data_categories: string[]
          id?: string
          is_active?: boolean | null
          legal_basis: string
          name: string
          purpose: string
          recipients: string[]
          retention_period: string
          third_country_transfer?: boolean | null
          transfer_safeguards?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data_categories?: string[]
          id?: string
          is_active?: boolean | null
          legal_basis?: string
          name?: string
          purpose?: string
          recipients?: string[]
          retention_period?: string
          third_country_transfer?: boolean | null
          transfer_safeguards?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rgpd_incidents: {
        Row: {
          cnil_notification_date: string | null
          cnil_notified: boolean | null
          containment_actions: string | null
          created_at: string | null
          data_affected: string[] | null
          description: string
          discovered_date: string
          id: string
          incident_date: string
          lessons_learned: string | null
          remediation_actions: string | null
          reported_by: string | null
          severity: string
          status: string | null
          updated_at: string | null
          users_affected_count: number | null
          users_notification_date: string | null
          users_notified: boolean | null
        }
        Insert: {
          cnil_notification_date?: string | null
          cnil_notified?: boolean | null
          containment_actions?: string | null
          created_at?: string | null
          data_affected?: string[] | null
          description: string
          discovered_date: string
          id?: string
          incident_date: string
          lessons_learned?: string | null
          remediation_actions?: string | null
          reported_by?: string | null
          severity: string
          status?: string | null
          updated_at?: string | null
          users_affected_count?: number | null
          users_notification_date?: string | null
          users_notified?: boolean | null
        }
        Update: {
          cnil_notification_date?: string | null
          cnil_notified?: boolean | null
          containment_actions?: string | null
          created_at?: string | null
          data_affected?: string[] | null
          description?: string
          discovered_date?: string
          id?: string
          incident_date?: string
          lessons_learned?: string | null
          remediation_actions?: string | null
          reported_by?: string | null
          severity?: string
          status?: string | null
          updated_at?: string | null
          users_affected_count?: number | null
          users_notification_date?: string | null
          users_notified?: boolean | null
        }
        Relationships: []
      }
      rgpd_purge_logs: {
        Row: {
          details: Json | null
          executed_at: string | null
          id: string
          purge_type: string
          records_anonymized: number | null
          records_deleted: number | null
        }
        Insert: {
          details?: Json | null
          executed_at?: string | null
          id?: string
          purge_type: string
          records_anonymized?: number | null
          records_deleted?: number | null
        }
        Update: {
          details?: Json | null
          executed_at?: string | null
          id?: string
          purge_type?: string
          records_anonymized?: number | null
          records_deleted?: number | null
        }
        Relationships: []
      }
      rgpd_rights_requests: {
        Row: {
          completed_at: string | null
          deadline_at: string | null
          handled_by: string | null
          id: string
          request_details: string | null
          request_type: string
          requested_at: string | null
          response_details: string | null
          status: string | null
          user_email: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          deadline_at?: string | null
          handled_by?: string | null
          id?: string
          request_details?: string | null
          request_type: string
          requested_at?: string | null
          response_details?: string | null
          status?: string | null
          user_email: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          deadline_at?: string | null
          handled_by?: string | null
          id?: string
          request_details?: string | null
          request_type?: string
          requested_at?: string | null
          response_details?: string | null
          status?: string | null
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      rgpd_subprocessors: {
        Row: {
          created_at: string | null
          data_processed: string[] | null
          dpa_signed_date: string | null
          dpa_url: string | null
          id: string
          is_active: boolean | null
          is_eu: boolean | null
          location: string
          name: string
          notes: string | null
          service_description: string
          transfer_safeguards: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_processed?: string[] | null
          dpa_signed_date?: string | null
          dpa_url?: string | null
          id?: string
          is_active?: boolean | null
          is_eu?: boolean | null
          location: string
          name: string
          notes?: string | null
          service_description: string
          transfer_safeguards?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_processed?: string[] | null
          dpa_signed_date?: string | null
          dpa_url?: string | null
          id?: string
          is_active?: boolean | null
          is_eu?: boolean | null
          location?: string
          name?: string
          notes?: string | null
          service_description?: string
          transfer_safeguards?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      security_anomalies: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          anomaly_type: string
          anr_id: string | null
          anr_latitude: number | null
          anr_longitude: number | null
          call_duration_seconds: number | null
          call_id: string | null
          created_at: string | null
          details: Json | null
          distance_meters: number | null
          habitation_id: string | null
          id: string
          is_acknowledged: boolean | null
          max_allowed_distance_meters: number | null
          max_allowed_duration_seconds: number | null
          severity: string
          visitor_latitude: number | null
          visitor_longitude: number | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          anomaly_type: string
          anr_id?: string | null
          anr_latitude?: number | null
          anr_longitude?: number | null
          call_duration_seconds?: number | null
          call_id?: string | null
          created_at?: string | null
          details?: Json | null
          distance_meters?: number | null
          habitation_id?: string | null
          id?: string
          is_acknowledged?: boolean | null
          max_allowed_distance_meters?: number | null
          max_allowed_duration_seconds?: number | null
          severity?: string
          visitor_latitude?: number | null
          visitor_longitude?: number | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          anomaly_type?: string
          anr_id?: string | null
          anr_latitude?: number | null
          anr_longitude?: number | null
          call_duration_seconds?: number | null
          call_id?: string | null
          created_at?: string | null
          details?: Json | null
          distance_meters?: number | null
          habitation_id?: string | null
          id?: string
          is_acknowledged?: boolean | null
          max_allowed_distance_meters?: number | null
          max_allowed_duration_seconds?: number | null
          severity?: string
          visitor_latitude?: number | null
          visitor_longitude?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "security_anomalies_anr_id_fkey"
            columns: ["anr_id"]
            isOneToOne: false
            referencedRelation: "anrs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_anomalies_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "call_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_anomalies_habitation_id_fkey"
            columns: ["habitation_id"]
            isOneToOne: false
            referencedRelation: "habitations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_results: {
        Row: {
          check_type: string
          created_at: string
          description: string
          id: string
          is_resolved: boolean | null
          policy_name: string | null
          recommendation: string | null
          resolved_at: string | null
          resolved_by: string | null
          run_id: string
          severity: string
          table_name: string | null
        }
        Insert: {
          check_type: string
          created_at?: string
          description: string
          id?: string
          is_resolved?: boolean | null
          policy_name?: string | null
          recommendation?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          run_id: string
          severity: string
          table_name?: string | null
        }
        Update: {
          check_type?: string
          created_at?: string
          description?: string
          id?: string
          is_resolved?: boolean | null
          policy_name?: string | null
          recommendation?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          run_id?: string
          severity?: string
          table_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_audit_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "security_audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_runs: {
        Row: {
          completed_at: string | null
          critical_issues: number | null
          id: string
          started_at: string
          status: string
          total_issues: number | null
          trigger_type: string
          triggered_by: string | null
          warning_issues: number | null
        }
        Insert: {
          completed_at?: string | null
          critical_issues?: number | null
          id?: string
          started_at?: string
          status?: string
          total_issues?: number | null
          trigger_type?: string
          triggered_by?: string | null
          warning_issues?: number | null
        }
        Update: {
          completed_at?: string | null
          critical_issues?: number | null
          id?: string
          started_at?: string
          status?: string
          total_issues?: number | null
          trigger_type?: string
          triggered_by?: string | null
          warning_issues?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          habitation_id: string | null
          id: string
          status: string
          stripe_customer_id: string
          stripe_session_id: string | null
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          habitation_id?: string | null
          id?: string
          status?: string
          stripe_customer_id: string
          stripe_session_id?: string | null
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          habitation_id?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string
          stripe_session_id?: string | null
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_habitation_id_fkey"
            columns: ["habitation_id"]
            isOneToOne: false
            referencedRelation: "habitations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_conversations: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          id: string
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          sender_id?: string | null
          sender_type: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          sender_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          consent_type: string
          consented: boolean
          consented_at: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
          version: string
        }
        Insert: {
          consent_type: string
          consented: boolean
          consented_at?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
          version: string
        }
        Update: {
          consent_type?: string
          consented?: boolean
          consented_at?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
          version?: string
        }
        Relationships: []
      }
      user_departments: {
        Row: {
          created_at: string
          department: Database["public"]["Enums"]["contact_department"]
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department: Database["public"]["Enums"]["contact_department"]
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: Database["public"]["Enums"]["contact_department"]
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_verifications: { Args: never; Returns: undefined }
      detect_call_duration_anomalies: {
        Args: never
        Returns: {
          call_ended_at: string
          call_id: string
          call_started_at: string
          duration_seconds: number
          habitation_id: string
          max_duration_seconds: number
        }[]
      }
      detect_gps_distance_anomalies: {
        Args: never
        Returns: {
          anr_id: string
          anr_lat: number
          anr_lon: number
          call_id: string
          call_started_at: string
          distance_m: number
          habitation_id: string
          max_distance_m: number
          visitor_lat: number
          visitor_lon: number
        }[]
      }
      get_permissive_policies: {
        Args: never
        Returns: {
          policy_name: string
          policy_qual: string
          table_name: string
        }[]
      }
      get_tables_without_policies: {
        Args: never
        Returns: {
          table_name: string
        }[]
      }
      get_tables_without_rls: {
        Args: never
        Returns: {
          table_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner_of: {
        Args: { _habitation_id: string; _user_id: string }
        Returns: boolean
      }
      is_resident_of: {
        Args: { _habitation_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "super_admin" | "analyst"
      contact_department:
        | "administratif"
        | "commercial"
        | "partenariat"
        | "presse"
        | "investisseurs"
        | "communication"
        | "informatique"
        | "collectivites"
      message_status: "new" | "read" | "in_progress" | "resolved"
      resident_status: "pending" | "verified" | "inactive"
      sender_type: "particulier" | "societe" | "collectivites"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "super_admin", "analyst"],
      contact_department: [
        "administratif",
        "commercial",
        "partenariat",
        "presse",
        "investisseurs",
        "communication",
        "informatique",
        "collectivites",
      ],
      message_status: ["new", "read", "in_progress", "resolved"],
      resident_status: ["pending", "verified", "inactive"],
      sender_type: ["particulier", "societe", "collectivites"],
    },
  },
} as const
