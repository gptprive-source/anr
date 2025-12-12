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
      assistant_guides: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          difficulty: string | null
          estimated_duration_seconds: number | null
          guide_key: string
          id: string
          is_active: boolean | null
          name: string
          required_plan: string[] | null
          sort_order: number | null
          steps: Json
          trigger_actions: string[] | null
          trigger_paths: string[] | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_duration_seconds?: number | null
          guide_key: string
          id?: string
          is_active?: boolean | null
          name: string
          required_plan?: string[] | null
          sort_order?: number | null
          steps?: Json
          trigger_actions?: string[] | null
          trigger_paths?: string[] | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_duration_seconds?: number | null
          guide_key?: string
          id?: string
          is_active?: boolean | null
          name?: string
          required_plan?: string[] | null
          sort_order?: number | null
          steps?: Json
          trigger_actions?: string[] | null
          trigger_paths?: string[] | null
          updated_at?: string | null
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
          admin_correction: string | null
          conversation_id: string | null
          corrected_at: string | null
          corrected_by: string | null
          created_at: string
          estimated_cost: number | null
          id: string
          input_tokens: number | null
          is_reviewed: boolean | null
          model: string | null
          output_tokens: number | null
          query_text: string | null
          response_preview: string | null
          source: string
          user_rating: string | null
        }
        Insert: {
          admin_correction?: string | null
          conversation_id?: string | null
          corrected_at?: string | null
          corrected_by?: string | null
          created_at?: string
          estimated_cost?: number | null
          id?: string
          input_tokens?: number | null
          is_reviewed?: boolean | null
          model?: string | null
          output_tokens?: number | null
          query_text?: string | null
          response_preview?: string | null
          source: string
          user_rating?: string | null
        }
        Update: {
          admin_correction?: string | null
          conversation_id?: string | null
          corrected_at?: string | null
          corrected_by?: string | null
          created_at?: string
          estimated_cost?: number | null
          id?: string
          input_tokens?: number | null
          is_reviewed?: boolean | null
          model?: string | null
          output_tokens?: number | null
          query_text?: string | null
          response_preview?: string | null
          source?: string
          user_rating?: string | null
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
      conversation_keys: {
        Row: {
          conversation_id: string
          created_at: string | null
          habitation_id: string | null
          id: string
          resident_public_key: string | null
          updated_at: string | null
          visitor_public_key: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          habitation_id?: string | null
          id?: string
          resident_public_key?: string | null
          updated_at?: string | null
          visitor_public_key?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          habitation_id?: string | null
          id?: string
          resident_public_key?: string | null
          updated_at?: string | null
          visitor_public_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_keys_habitation_id_fkey"
            columns: ["habitation_id"]
            isOneToOne: false
            referencedRelation: "habitations"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_sessions: {
        Row: {
          active_guide_id: string | null
          company_id: string | null
          created_at: string | null
          current_action: string | null
          current_path: string | null
          current_section: string | null
          current_step: number | null
          ended_at: string | null
          form_state: Json | null
          guide_completed_at: string | null
          guide_started_at: string | null
          id: string
          last_activity_at: string | null
          messages: Json | null
          started_at: string | null
          status: string | null
          user_id: string
          visible_elements: Json | null
        }
        Insert: {
          active_guide_id?: string | null
          company_id?: string | null
          created_at?: string | null
          current_action?: string | null
          current_path?: string | null
          current_section?: string | null
          current_step?: number | null
          ended_at?: string | null
          form_state?: Json | null
          guide_completed_at?: string | null
          guide_started_at?: string | null
          id?: string
          last_activity_at?: string | null
          messages?: Json | null
          started_at?: string | null
          status?: string | null
          user_id: string
          visible_elements?: Json | null
        }
        Update: {
          active_guide_id?: string | null
          company_id?: string | null
          created_at?: string | null
          current_action?: string | null
          current_path?: string | null
          current_section?: string | null
          current_step?: number | null
          ended_at?: string | null
          form_state?: Json | null
          guide_completed_at?: string | null
          guide_started_at?: string | null
          id?: string
          last_activity_at?: string | null
          messages?: Json | null
          started_at?: string | null
          status?: string | null
          user_id?: string
          visible_elements?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "copilot_sessions_active_guide_id_fkey"
            columns: ["active_guide_id"]
            isOneToOne: false
            referencedRelation: "assistant_guides"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_usage: {
        Row: {
          company_id: string | null
          created_at: string | null
          estimated_cost: number | null
          guides_completed: number | null
          id: string
          input_tokens: number | null
          messages_count: number | null
          output_tokens: number | null
          session_id: string | null
          usage_date: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          estimated_cost?: number | null
          guides_completed?: number | null
          id?: string
          input_tokens?: number | null
          messages_count?: number | null
          output_tokens?: number | null
          session_id?: string | null
          usage_date?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          estimated_cost?: number | null
          guides_completed?: number | null
          id?: string
          input_tokens?: number | null
          messages_count?: number | null
          output_tokens?: number | null
          session_id?: string | null
          usage_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_usage_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "copilot_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_usage_logs: {
        Row: {
          call_id: string | null
          duration_seconds: number
          ended_at: string | null
          estimated_cost_usd: number
          id: string
          is_group_call: boolean
          is_video: boolean
          participant_count: number
          participant_minutes: number
          room_name: string
          started_at: string | null
          synced_at: string
        }
        Insert: {
          call_id?: string | null
          duration_seconds?: number
          ended_at?: string | null
          estimated_cost_usd?: number
          id?: string
          is_group_call?: boolean
          is_video?: boolean
          participant_count?: number
          participant_minutes?: number
          room_name: string
          started_at?: string | null
          synced_at?: string
        }
        Update: {
          call_id?: string | null
          duration_seconds?: number
          ended_at?: string | null
          estimated_cost_usd?: number
          id?: string
          is_group_call?: boolean
          is_video?: boolean
          participant_count?: number
          participant_minutes?: number
          room_name?: string
          started_at?: string | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_usage_logs_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "call_logs"
            referencedColumns: ["id"]
          },
        ]
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
      door_access_logs: {
        Row: {
          action: string
          anr_id: string | null
          company_id: string | null
          created_at: string | null
          details: Json | null
          device_firmware: string | null
          device_id: string | null
          door_module_id: string | null
          duration_seconds: number | null
          employee_id: string | null
          error_code: string | null
          error_details: string | null
          face_confidence: number | null
          face_required: boolean | null
          face_verified: boolean | null
          gps_distance_meters: number | null
          gps_latitude: number | null
          gps_longitude: number | null
          id: string
          ip_address: string | null
          method: string | null
          resident_id: string | null
          result: string
          rssi: number | null
          schedule_id: string | null
          session_id: string | null
          timestamp_device: string | null
          timestamp_server: string | null
          token_id: string | null
          user_agent: string | null
          visitor_device_id: string | null
          visitor_user_id: string | null
        }
        Insert: {
          action: string
          anr_id?: string | null
          company_id?: string | null
          created_at?: string | null
          details?: Json | null
          device_firmware?: string | null
          device_id?: string | null
          door_module_id?: string | null
          duration_seconds?: number | null
          employee_id?: string | null
          error_code?: string | null
          error_details?: string | null
          face_confidence?: number | null
          face_required?: boolean | null
          face_verified?: boolean | null
          gps_distance_meters?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          ip_address?: string | null
          method?: string | null
          resident_id?: string | null
          result: string
          rssi?: number | null
          schedule_id?: string | null
          session_id?: string | null
          timestamp_device?: string | null
          timestamp_server?: string | null
          token_id?: string | null
          user_agent?: string | null
          visitor_device_id?: string | null
          visitor_user_id?: string | null
        }
        Update: {
          action?: string
          anr_id?: string | null
          company_id?: string | null
          created_at?: string | null
          details?: Json | null
          device_firmware?: string | null
          device_id?: string | null
          door_module_id?: string | null
          duration_seconds?: number | null
          employee_id?: string | null
          error_code?: string | null
          error_details?: string | null
          face_confidence?: number | null
          face_required?: boolean | null
          face_verified?: boolean | null
          gps_distance_meters?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          ip_address?: string | null
          method?: string | null
          resident_id?: string | null
          result?: string
          rssi?: number | null
          schedule_id?: string | null
          session_id?: string | null
          timestamp_device?: string | null
          timestamp_server?: string | null
          token_id?: string | null
          user_agent?: string | null
          visitor_device_id?: string | null
          visitor_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "door_access_logs_anr_id_fkey"
            columns: ["anr_id"]
            isOneToOne: false
            referencedRelation: "anrs"
            referencedColumns: ["id"]
          },
        ]
      }
      door_access_sessions: {
        Row: {
          anr_id: string
          assignment_id: string | null
          company_id: string | null
          created_at: string | null
          device_id: string | null
          duration_seconds: number | null
          employee_id: string | null
          entry_at: string
          entry_gps_distance_meters: number | null
          entry_gps_lat: number | null
          entry_gps_lon: number | null
          exit_at: string | null
          exit_gps_distance_meters: number | null
          exit_gps_lat: number | null
          exit_gps_lon: number | null
          face_confidence_entry: number | null
          face_confidence_exit: number | null
          face_verified_entry: boolean | null
          face_verified_exit: boolean | null
          id: string
          notes: string | null
          schedule_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          anr_id: string
          assignment_id?: string | null
          company_id?: string | null
          created_at?: string | null
          device_id?: string | null
          duration_seconds?: number | null
          employee_id?: string | null
          entry_at: string
          entry_gps_distance_meters?: number | null
          entry_gps_lat?: number | null
          entry_gps_lon?: number | null
          exit_at?: string | null
          exit_gps_distance_meters?: number | null
          exit_gps_lat?: number | null
          exit_gps_lon?: number | null
          face_confidence_entry?: number | null
          face_confidence_exit?: number | null
          face_verified_entry?: boolean | null
          face_verified_exit?: boolean | null
          id?: string
          notes?: string | null
          schedule_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          anr_id?: string
          assignment_id?: string | null
          company_id?: string | null
          created_at?: string | null
          device_id?: string | null
          duration_seconds?: number | null
          employee_id?: string | null
          entry_at?: string
          entry_gps_distance_meters?: number | null
          entry_gps_lat?: number | null
          entry_gps_lon?: number | null
          exit_at?: string | null
          exit_gps_distance_meters?: number | null
          exit_gps_lat?: number | null
          exit_gps_lon?: number | null
          face_confidence_entry?: number | null
          face_confidence_exit?: number | null
          face_verified_entry?: boolean | null
          face_verified_exit?: boolean | null
          id?: string
          notes?: string | null
          schedule_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "door_access_sessions_anr_id_fkey"
            columns: ["anr_id"]
            isOneToOne: false
            referencedRelation: "anrs"
            referencedColumns: ["id"]
          },
        ]
      }
      door_access_tokens: {
        Row: {
          anr_id: string
          call_id: string | null
          consumed_at: string | null
          consumed_by_module: string | null
          consumed_result: string | null
          created_at: string | null
          granted_by: string
          granted_to_company: string | null
          granted_to_employee: string | null
          granted_to_user: string | null
          id: string
          issued_at: string | null
          mode: string | null
          nonce: string
          schedule_id: string | null
          scope: string | null
          session_id: string | null
          token_hash: string
          token_id: string
          valid_from: string
          valid_until: string
          visitor_device_id: string | null
        }
        Insert: {
          anr_id: string
          call_id?: string | null
          consumed_at?: string | null
          consumed_by_module?: string | null
          consumed_result?: string | null
          created_at?: string | null
          granted_by: string
          granted_to_company?: string | null
          granted_to_employee?: string | null
          granted_to_user?: string | null
          id?: string
          issued_at?: string | null
          mode?: string | null
          nonce: string
          schedule_id?: string | null
          scope?: string | null
          session_id?: string | null
          token_hash: string
          token_id: string
          valid_from: string
          valid_until: string
          visitor_device_id?: string | null
        }
        Update: {
          anr_id?: string
          call_id?: string | null
          consumed_at?: string | null
          consumed_by_module?: string | null
          consumed_result?: string | null
          created_at?: string | null
          granted_by?: string
          granted_to_company?: string | null
          granted_to_employee?: string | null
          granted_to_user?: string | null
          id?: string
          issued_at?: string | null
          mode?: string | null
          nonce?: string
          schedule_id?: string | null
          scope?: string | null
          session_id?: string | null
          token_hash?: string
          token_id?: string
          valid_from?: string
          valid_until?: string
          visitor_device_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "door_access_tokens_anr_id_fkey"
            columns: ["anr_id"]
            isOneToOne: false
            referencedRelation: "anrs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "door_access_tokens_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "call_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      door_modules: {
        Row: {
          anr_id: string
          created_at: string | null
          device_id: string
          firmware_version: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          module_type: string | null
          relay_duration_ms: number | null
          rssi_threshold: number | null
          secret_key: string
          updated_at: string | null
        }
        Insert: {
          anr_id: string
          created_at?: string | null
          device_id: string
          firmware_version?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          module_type?: string | null
          relay_duration_ms?: number | null
          rssi_threshold?: number | null
          secret_key: string
          updated_at?: string | null
        }
        Update: {
          anr_id?: string
          created_at?: string | null
          device_id?: string
          firmware_version?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          module_type?: string | null
          relay_duration_ms?: number | null
          rssi_threshold?: number | null
          secret_key?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "door_modules_anr_id_fkey"
            columns: ["anr_id"]
            isOneToOne: false
            referencedRelation: "anrs"
            referencedColumns: ["id"]
          },
        ]
      }
      door_scheduled_access: {
        Row: {
          access_code: string | null
          anr_id: string
          auto_clockout_minutes: number | null
          beneficiary_anr_code: string | null
          beneficiary_first_name: string | null
          beneficiary_last_name: string | null
          created_at: string | null
          days_of_week: number[] | null
          description: string | null
          forward_calls_to_beneficiary: boolean | null
          granted_by: string
          granted_to_company: string | null
          granted_to_user: string | null
          guest_contact: string | null
          guest_name: string | null
          id: string
          instructions_for_visitor: string | null
          is_active: boolean | null
          max_entries_per_day: number | null
          name: string
          notes: string | null
          recurrence: string | null
          require_face_recognition_entry: boolean | null
          require_face_recognition_exit: boolean | null
          time_from: string
          time_to: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          access_code?: string | null
          anr_id: string
          auto_clockout_minutes?: number | null
          beneficiary_anr_code?: string | null
          beneficiary_first_name?: string | null
          beneficiary_last_name?: string | null
          created_at?: string | null
          days_of_week?: number[] | null
          description?: string | null
          forward_calls_to_beneficiary?: boolean | null
          granted_by: string
          granted_to_company?: string | null
          granted_to_user?: string | null
          guest_contact?: string | null
          guest_name?: string | null
          id?: string
          instructions_for_visitor?: string | null
          is_active?: boolean | null
          max_entries_per_day?: number | null
          name: string
          notes?: string | null
          recurrence?: string | null
          require_face_recognition_entry?: boolean | null
          require_face_recognition_exit?: boolean | null
          time_from: string
          time_to: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          access_code?: string | null
          anr_id?: string
          auto_clockout_minutes?: number | null
          beneficiary_anr_code?: string | null
          beneficiary_first_name?: string | null
          beneficiary_last_name?: string | null
          created_at?: string | null
          days_of_week?: number[] | null
          description?: string | null
          forward_calls_to_beneficiary?: boolean | null
          granted_by?: string
          granted_to_company?: string | null
          granted_to_user?: string | null
          guest_contact?: string | null
          guest_name?: string | null
          id?: string
          instructions_for_visitor?: string | null
          is_active?: boolean | null
          max_entries_per_day?: number | null
          name?: string
          notes?: string | null
          recurrence?: string | null
          require_face_recognition_entry?: boolean | null
          require_face_recognition_exit?: boolean | null
          time_from?: string
          time_to?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "door_scheduled_access_anr_id_fkey"
            columns: ["anr_id"]
            isOneToOne: false
            referencedRelation: "anrs"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_services: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          coverage_zone: string | null
          created_at: string | null
          department_code: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          name: string
          organization_type: string
          siret: string | null
          updated_at: string | null
          verification_document_url: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          coverage_zone?: string | null
          created_at?: string | null
          department_code?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          name: string
          organization_type: string
          siret?: string | null
          updated_at?: string | null
          verification_document_url?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          coverage_zone?: string | null
          created_at?: string | null
          department_code?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          name?: string
          organization_type?: string
          siret?: string | null
          updated_at?: string | null
          verification_document_url?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      face_embeddings: {
        Row: {
          consent_given: boolean
          consent_ip_address: string | null
          consent_method: string | null
          consent_timestamp: string | null
          consent_user_agent: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_reason: string | null
          embedding: Json
          embedding_version: string | null
          employee_id: string | null
          id: string
          last_verified_at: string | null
          quality_score: number | null
          registered_at: string | null
          updated_at: string | null
          user_id: string | null
          verification_count: number | null
        }
        Insert: {
          consent_given?: boolean
          consent_ip_address?: string | null
          consent_method?: string | null
          consent_timestamp?: string | null
          consent_user_agent?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_reason?: string | null
          embedding: Json
          embedding_version?: string | null
          employee_id?: string | null
          id?: string
          last_verified_at?: string | null
          quality_score?: number | null
          registered_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_count?: number | null
        }
        Update: {
          consent_given?: boolean
          consent_ip_address?: string | null
          consent_method?: string | null
          consent_timestamp?: string | null
          consent_user_agent?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_reason?: string | null
          embedding?: Json
          embedding_version?: string | null
          employee_id?: string | null
          id?: string
          last_verified_at?: string | null
          quality_score?: number | null
          registered_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_count?: number | null
        }
        Relationships: []
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
      faq_sections: {
        Row: {
          created_at: string | null
          created_by: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
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
      message_replies: {
        Row: {
          created_at: string | null
          encrypted_reply: string | null
          habitation_id: string
          id: string
          is_encrypted: boolean | null
          is_read: boolean | null
          original_message_id: string
          read_at: string | null
          reply_media_type: string | null
          reply_media_url: string | null
          reply_nonce: string | null
          reply_text: string | null
          reply_voice_url: string | null
          resident_id: string
        }
        Insert: {
          created_at?: string | null
          encrypted_reply?: string | null
          habitation_id: string
          id?: string
          is_encrypted?: boolean | null
          is_read?: boolean | null
          original_message_id: string
          read_at?: string | null
          reply_media_type?: string | null
          reply_media_url?: string | null
          reply_nonce?: string | null
          reply_text?: string | null
          reply_voice_url?: string | null
          resident_id: string
        }
        Update: {
          created_at?: string | null
          encrypted_reply?: string | null
          habitation_id?: string
          id?: string
          is_encrypted?: boolean | null
          is_read?: boolean | null
          original_message_id?: string
          read_at?: string | null
          reply_media_type?: string | null
          reply_media_url?: string | null
          reply_nonce?: string | null
          reply_text?: string | null
          reply_voice_url?: string | null
          resident_id?: string
        }
        Relationships: []
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
      pro_activity_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string | null
          employee_id: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string | null
          employee_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string | null
          employee_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pro_activity_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pro_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_companies: {
        Row: {
          address: string | null
          auto_clockout_minutes: number | null
          city: string | null
          company_type: string | null
          contact_email: string
          contact_name: string | null
          contact_phone: string | null
          copilot_addon_price: number | null
          copilot_enabled: boolean | null
          country: string | null
          created_at: string | null
          enable_client_signature: boolean | null
          enable_geofencing: boolean | null
          enable_gps_tracking: boolean | null
          enable_webhook: boolean | null
          geofencing_radius_meters: number | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          legal_name: string | null
          logo_url: string | null
          max_active_authorizations: number | null
          max_employees: number | null
          name: string
          plan_type: string | null
          postal_code: string | null
          require_face_recognition_default: boolean | null
          sector: string | null
          siren: string | null
          siret: string | null
          subscription_id: string | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
          webhook_events: string[] | null
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          address?: string | null
          auto_clockout_minutes?: number | null
          city?: string | null
          company_type?: string | null
          contact_email: string
          contact_name?: string | null
          contact_phone?: string | null
          copilot_addon_price?: number | null
          copilot_enabled?: boolean | null
          country?: string | null
          created_at?: string | null
          enable_client_signature?: boolean | null
          enable_geofencing?: boolean | null
          enable_gps_tracking?: boolean | null
          enable_webhook?: boolean | null
          geofencing_radius_meters?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          legal_name?: string | null
          logo_url?: string | null
          max_active_authorizations?: number | null
          max_employees?: number | null
          name: string
          plan_type?: string | null
          postal_code?: string | null
          require_face_recognition_default?: boolean | null
          sector?: string | null
          siren?: string | null
          siret?: string | null
          subscription_id?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
          webhook_events?: string[] | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          address?: string | null
          auto_clockout_minutes?: number | null
          city?: string | null
          company_type?: string | null
          contact_email?: string
          contact_name?: string | null
          contact_phone?: string | null
          copilot_addon_price?: number | null
          copilot_enabled?: boolean | null
          country?: string | null
          created_at?: string | null
          enable_client_signature?: boolean | null
          enable_geofencing?: boolean | null
          enable_gps_tracking?: boolean | null
          enable_webhook?: boolean | null
          geofencing_radius_meters?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          legal_name?: string | null
          logo_url?: string | null
          max_active_authorizations?: number | null
          max_employees?: number | null
          name?: string
          plan_type?: string | null
          postal_code?: string | null
          require_face_recognition_default?: boolean | null
          sector?: string | null
          siren?: string | null
          siret?: string | null
          subscription_id?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
          webhook_events?: string[] | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      pro_company_roles: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          permissions: Json | null
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          permissions?: Json | null
          role: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          permissions?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_company_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pro_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_employee_assignments: {
        Row: {
          assigned_date: string
          client_notes: string | null
          client_signature: string | null
          client_signature_at: string | null
          client_signature_name: string | null
          company_id: string
          created_at: string | null
          duration_minutes: number | null
          employee_id: string
          employee_report: string | null
          entry_at: string | null
          exit_at: string | null
          geofencing_alerts: number | null
          id: string
          mission_notes: string | null
          mission_type: string | null
          priority: string | null
          resident_comment: string | null
          resident_rating: number | null
          schedule_id: string
          session_id: string | null
          status: string | null
          time_from: string | null
          time_to: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_date: string
          client_notes?: string | null
          client_signature?: string | null
          client_signature_at?: string | null
          client_signature_name?: string | null
          company_id: string
          created_at?: string | null
          duration_minutes?: number | null
          employee_id: string
          employee_report?: string | null
          entry_at?: string | null
          exit_at?: string | null
          geofencing_alerts?: number | null
          id?: string
          mission_notes?: string | null
          mission_type?: string | null
          priority?: string | null
          resident_comment?: string | null
          resident_rating?: number | null
          schedule_id: string
          session_id?: string | null
          status?: string | null
          time_from?: string | null
          time_to?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_date?: string
          client_notes?: string | null
          client_signature?: string | null
          client_signature_at?: string | null
          client_signature_name?: string | null
          company_id?: string
          created_at?: string | null
          duration_minutes?: number | null
          employee_id?: string
          employee_report?: string | null
          entry_at?: string | null
          exit_at?: string | null
          geofencing_alerts?: number | null
          id?: string
          mission_notes?: string | null
          mission_type?: string | null
          priority?: string | null
          resident_comment?: string | null
          resident_rating?: number | null
          schedule_id?: string
          session_id?: string | null
          status?: string | null
          time_from?: string | null
          time_to?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pro_employee_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pro_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pro_employee_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pro_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_employees: {
        Row: {
          can_manage_employees: boolean | null
          can_self_assign: boolean | null
          company_id: string
          created_at: string | null
          department: string | null
          email: string | null
          employee_number: string | null
          first_name: string
          id: string
          invited_at: string | null
          is_active: boolean | null
          joined_at: string | null
          last_activity_at: string | null
          last_name: string
          max_hours_per_day: number | null
          phone: string | null
          photo_url: string | null
          role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          can_manage_employees?: boolean | null
          can_self_assign?: boolean | null
          company_id: string
          created_at?: string | null
          department?: string | null
          email?: string | null
          employee_number?: string | null
          first_name: string
          id?: string
          invited_at?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          last_activity_at?: string | null
          last_name: string
          max_hours_per_day?: number | null
          phone?: string | null
          photo_url?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          can_manage_employees?: boolean | null
          can_self_assign?: boolean | null
          company_id?: string
          created_at?: string | null
          department?: string | null
          email?: string | null
          employee_number?: string | null
          first_name?: string
          id?: string
          invited_at?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          last_activity_at?: string | null
          last_name?: string
          max_hours_per_day?: number | null
          phone?: string | null
          photo_url?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pro_employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pro_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          allow_emergency_access: boolean | null
          created_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone_number: string | null
          phone_verified: boolean | null
          updated_at: string | null
        }
        Insert: {
          allow_emergency_access?: boolean | null
          created_at?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allow_emergency_access?: boolean | null
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
      resident_contacts: {
        Row: {
          anr_code: string | null
          avatar_url: string | null
          company_name: string | null
          contact_type: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          is_favorite: boolean | null
          job_title: string | null
          last_name: string | null
          notes: string | null
          phone: string | null
          source_business_card_id: string | null
          source_message_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          anr_code?: string | null
          avatar_url?: string | null
          company_name?: string | null
          contact_type?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_favorite?: boolean | null
          job_title?: string | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          source_business_card_id?: string | null
          source_message_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          anr_code?: string | null
          avatar_url?: string | null
          company_name?: string | null
          contact_type?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_favorite?: boolean | null
          job_title?: string | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          source_business_card_id?: string | null
          source_message_id?: string | null
          updated_at?: string | null
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
          plan_type: string | null
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
          plan_type?: string | null
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
          plan_type?: string | null
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
      visitor_business_cards: {
        Row: {
          avatar_url: string | null
          card_type: string
          company_name: string | null
          created_at: string | null
          device_id: string
          email: string | null
          expires_at: string | null
          first_name: string | null
          id: string
          job_title: string | null
          last_name: string | null
          phone: string | null
          updated_at: string | null
          visitor_anr_code: string | null
        }
        Insert: {
          avatar_url?: string | null
          card_type?: string
          company_name?: string | null
          created_at?: string | null
          device_id: string
          email?: string | null
          expires_at?: string | null
          first_name?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
          visitor_anr_code?: string | null
        }
        Update: {
          avatar_url?: string | null
          card_type?: string
          company_name?: string | null
          created_at?: string | null
          device_id?: string
          email?: string | null
          expires_at?: string | null
          first_name?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
          visitor_anr_code?: string | null
        }
        Relationships: []
      }
      visitor_custom_templates: {
        Row: {
          content: string
          created_at: string | null
          device_id: string
          icon: string | null
          id: string
          name: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          device_id: string
          icon?: string | null
          id?: string
          name: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          device_id?: string
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      visitor_message_templates: {
        Row: {
          content: string
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      visitor_messages: {
        Row: {
          business_card_id: string | null
          conversation_token: string | null
          created_at: string | null
          encrypted_message: string | null
          habitation_id: string
          has_reply: boolean | null
          id: string
          is_encrypted: boolean | null
          is_read: boolean | null
          message: string | null
          message_nonce: string | null
          read_at: string | null
          replied_at: string | null
          visitor_latitude: number | null
          visitor_longitude: number | null
          visitor_phone: string | null
          visitor_public_key: string | null
          voice_message_url: string | null
        }
        Insert: {
          business_card_id?: string | null
          conversation_token?: string | null
          created_at?: string | null
          encrypted_message?: string | null
          habitation_id: string
          has_reply?: boolean | null
          id?: string
          is_encrypted?: boolean | null
          is_read?: boolean | null
          message?: string | null
          message_nonce?: string | null
          read_at?: string | null
          replied_at?: string | null
          visitor_latitude?: number | null
          visitor_longitude?: number | null
          visitor_phone?: string | null
          visitor_public_key?: string | null
          voice_message_url?: string | null
        }
        Update: {
          business_card_id?: string | null
          conversation_token?: string | null
          created_at?: string | null
          encrypted_message?: string | null
          habitation_id?: string
          has_reply?: boolean | null
          id?: string
          is_encrypted?: boolean | null
          is_read?: boolean | null
          message?: string | null
          message_nonce?: string | null
          read_at?: string | null
          replied_at?: string | null
          visitor_latitude?: number | null
          visitor_longitude?: number | null
          visitor_phone?: string | null
          visitor_public_key?: string | null
          voice_message_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visitor_messages_business_card_id_fkey"
            columns: ["business_card_id"]
            isOneToOne: false
            referencedRelation: "visitor_business_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_messages_habitation_id_fkey"
            columns: ["habitation_id"]
            isOneToOne: false
            referencedRelation: "habitations"
            referencedColumns: ["id"]
          },
        ]
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
      is_company_owner: {
        Args: { _company_id: string; _user_id: string }
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
