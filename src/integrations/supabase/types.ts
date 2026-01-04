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
      admin_communications: {
        Row: {
          allow_reply: boolean
          content: string
          created_at: string
          id: string
          is_active: boolean
          sender_id: string
          sent_at: string
          target_type: string
          target_user_ids: string[] | null
          title: string
        }
        Insert: {
          allow_reply?: boolean
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          sender_id: string
          sent_at?: string
          target_type?: string
          target_user_ids?: string[] | null
          title: string
        }
        Update: {
          allow_reply?: boolean
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          sender_id?: string
          sent_at?: string
          target_type?: string
          target_user_ids?: string[] | null
          title?: string
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
          nfc_serial: string | null
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
          nfc_serial?: string | null
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
          nfc_serial?: string | null
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
      blocked_visitors: {
        Row: {
          blocked_at: string
          created_at: string
          id: string
          reason: string | null
          user_id: string
          visitor_identifier: string
          visitor_name: string | null
        }
        Insert: {
          blocked_at?: string
          created_at?: string
          id?: string
          reason?: string | null
          user_id: string
          visitor_identifier: string
          visitor_name?: string | null
        }
        Update: {
          blocked_at?: string
          created_at?: string
          id?: string
          reason?: string | null
          user_id?: string
          visitor_identifier?: string
          visitor_name?: string | null
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
          target_user_id: string | null
          visitor_device_id: string | null
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
          target_user_id?: string | null
          visitor_device_id?: string | null
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
          target_user_id?: string | null
          visitor_device_id?: string | null
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
      carrier_invoices: {
        Row: {
          amount_ht: number
          amount_ttc: number
          carrier_id: string
          created_at: string | null
          due_date: string | null
          id: string
          invoice_number: string
          line_items: Json | null
          paid_at: string | null
          parcels_count: number
          pdf_url: string | null
          period_end: string
          period_start: string
          status: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          amount_ht: number
          amount_ttc: number
          carrier_id: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          line_items?: Json | null
          paid_at?: string | null
          parcels_count?: number
          pdf_url?: string | null
          period_end: string
          period_start: string
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          amount_ht?: number
          amount_ttc?: number
          carrier_id?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          line_items?: Json | null
          paid_at?: string | null
          parcels_count?: number
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "carrier_invoices_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
        ]
      }
      carriers: {
        Row: {
          address: string | null
          api_enabled: boolean | null
          api_key_hash: string | null
          billing_email: string | null
          company_name: string
          contact_email: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          siret: string | null
          stripe_customer_id: string | null
          total_parcels: number | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          address?: string | null
          api_enabled?: boolean | null
          api_key_hash?: string | null
          billing_email?: string | null
          company_name: string
          contact_email: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          siret?: string | null
          stripe_customer_id?: string | null
          total_parcels?: number | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          address?: string | null
          api_enabled?: boolean | null
          api_key_hash?: string | null
          billing_email?: string | null
          company_name?: string
          contact_email?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          siret?: string | null
          stripe_customer_id?: string | null
          total_parcels?: number | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          call_duration_seconds: number | null
          chat_id: string
          content: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_for_everyone: boolean | null
          deleted_for_recipient: boolean | null
          deleted_for_sender: boolean | null
          forwarded_from_id: string | null
          id: string
          is_read: boolean | null
          media_type: string | null
          media_url: string | null
          message_type: string | null
          sender_id: string
          voice_url: string | null
        }
        Insert: {
          call_duration_seconds?: number | null
          chat_id: string
          content?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_for_everyone?: boolean | null
          deleted_for_recipient?: boolean | null
          deleted_for_sender?: boolean | null
          forwarded_from_id?: string | null
          id?: string
          is_read?: boolean | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string | null
          sender_id: string
          voice_url?: string | null
        }
        Update: {
          call_duration_seconds?: number | null
          chat_id?: string
          content?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_for_everyone?: boolean | null
          deleted_for_recipient?: boolean | null
          deleted_for_sender?: boolean | null
          forwarded_from_id?: string | null
          id?: string
          is_read?: boolean | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string | null
          sender_id?: string
          voice_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_forwarded_from_id_fkey"
            columns: ["forwarded_from_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
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
      chats: {
        Row: {
          created_at: string | null
          deleted_for_p1: boolean | null
          deleted_for_p2: boolean | null
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          participant1_id: string
          participant2_id: string
          unread_count_p1: number | null
          unread_count_p2: number | null
        }
        Insert: {
          created_at?: string | null
          deleted_for_p1?: boolean | null
          deleted_for_p2?: boolean | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          participant1_id: string
          participant2_id: string
          unread_count_p1?: number | null
          unread_count_p2?: number | null
        }
        Update: {
          created_at?: string | null
          deleted_for_p1?: boolean | null
          deleted_for_p2?: boolean | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          participant1_id?: string
          participant2_id?: string
          unread_count_p1?: number | null
          unread_count_p2?: number | null
        }
        Relationships: []
      }
      communication_replies: {
        Row: {
          communication_id: string
          created_at: string
          id: string
          reply_text: string
          user_id: string
        }
        Insert: {
          communication_id: string
          created_at?: string
          id?: string
          reply_text: string
          user_id: string
        }
        Update: {
          communication_id?: string
          created_at?: string
          id?: string
          reply_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_replies_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "admin_communications"
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
      device_auth_sessions: {
        Row: {
          approved_at: string | null
          approved_by_device_id: string | null
          created_at: string
          expires_at: string
          id: string
          new_device_id: string
          new_device_name: string | null
          session_token: string
          status: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_device_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          new_device_id: string
          new_device_name?: string | null
          session_token: string
          status?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by_device_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          new_device_id?: string
          new_device_name?: string | null
          session_token?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      doming_orders: {
        Row: {
          anr_id: string
          created_at: string | null
          id: string
          is_free: boolean | null
          order_type: string
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
          order_type?: string
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
          order_type?: string
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
      email_templates: {
        Row: {
          category: string
          created_at: string | null
          default_html_content: string | null
          description: string | null
          html_content: string
          id: string
          is_active: boolean | null
          last_test_sent_at: string | null
          last_test_sent_to: string | null
          legal_review_at: string | null
          legal_review_by: string | null
          name: string
          preview_data: Json | null
          subject: string
          template_key: string
          text_content: string | null
          updated_at: string | null
          updated_by: string | null
          variables: Json | null
          version: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          default_html_content?: string | null
          description?: string | null
          html_content: string
          id?: string
          is_active?: boolean | null
          last_test_sent_at?: string | null
          last_test_sent_to?: string | null
          legal_review_at?: string | null
          legal_review_by?: string | null
          name: string
          preview_data?: Json | null
          subject: string
          template_key: string
          text_content?: string | null
          updated_at?: string | null
          updated_by?: string | null
          variables?: Json | null
          version?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          default_html_content?: string | null
          description?: string | null
          html_content?: string
          id?: string
          is_active?: boolean | null
          last_test_sent_at?: string | null
          last_test_sent_to?: string | null
          legal_review_at?: string | null
          legal_review_by?: string | null
          name?: string
          preview_data?: Json | null
          subject?: string
          template_key?: string
          text_content?: string | null
          updated_at?: string | null
          updated_by?: string | null
          variables?: Json | null
          version?: number | null
        }
        Relationships: []
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
      google_drive_tokens: {
        Row: {
          access_token: string
          created_at: string
          google_email: string | null
          id: string
          refresh_token: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          google_email?: string | null
          id?: string
          refresh_token: string
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          google_email?: string | null
          id?: string
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
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
      parcel_proofs: {
        Row: {
          actor_carrier_id: string | null
          actor_driver_id: string | null
          actor_name: string | null
          actor_relay_id: string | null
          actor_user_id: string | null
          created_at: string | null
          device_id_hash: string | null
          device_info: Json | null
          geo_accuracy_m: number | null
          geo_latitude: number | null
          geo_longitude: number | null
          id: string
          notes: string | null
          parcel_id: string
          photo_url: string | null
          proof_data: Json
          proof_hash: string
          proof_type: string
          recipient_name: string | null
          recipient_user_id: string | null
          scan_method: string | null
          signature: string | null
          timestamp_device: string | null
          timestamp_utc: string
          timezone: string | null
        }
        Insert: {
          actor_carrier_id?: string | null
          actor_driver_id?: string | null
          actor_name?: string | null
          actor_relay_id?: string | null
          actor_user_id?: string | null
          created_at?: string | null
          device_id_hash?: string | null
          device_info?: Json | null
          geo_accuracy_m?: number | null
          geo_latitude?: number | null
          geo_longitude?: number | null
          id?: string
          notes?: string | null
          parcel_id: string
          photo_url?: string | null
          proof_data: Json
          proof_hash: string
          proof_type: string
          recipient_name?: string | null
          recipient_user_id?: string | null
          scan_method?: string | null
          signature?: string | null
          timestamp_device?: string | null
          timestamp_utc?: string
          timezone?: string | null
        }
        Update: {
          actor_carrier_id?: string | null
          actor_driver_id?: string | null
          actor_name?: string | null
          actor_relay_id?: string | null
          actor_user_id?: string | null
          created_at?: string | null
          device_id_hash?: string | null
          device_info?: Json | null
          geo_accuracy_m?: number | null
          geo_latitude?: number | null
          geo_longitude?: number | null
          id?: string
          notes?: string | null
          parcel_id?: string
          photo_url?: string | null
          proof_data?: Json
          proof_hash?: string
          proof_type?: string
          recipient_name?: string | null
          recipient_user_id?: string | null
          scan_method?: string | null
          signature?: string | null
          timestamp_device?: string | null
          timestamp_utc?: string
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parcel_proofs_actor_carrier_id_fkey"
            columns: ["actor_carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcel_proofs_actor_relay_id_fkey"
            columns: ["actor_relay_id"]
            isOneToOne: false
            referencedRelation: "relay_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcel_proofs_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      parcel_qr_tokens: {
        Row: {
          consumed_at: string | null
          created_at: string | null
          emitter_id: string
          emitter_type: string
          expected_anr_id: string | null
          expected_nfc_serial: string | null
          expires_at: string
          geo_latitude: number | null
          geo_longitude: number | null
          id: string
          issued_at: string | null
          local_proof_hash: string | null
          nfc_anr_code_scanned: string | null
          nfc_scan_at: string | null
          nfc_serial_scanned: string | null
          parcel_id: string | null
          proof_type: string
          qr_scan_at: string | null
          status: string | null
          token_hash: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string | null
          emitter_id: string
          emitter_type: string
          expected_anr_id?: string | null
          expected_nfc_serial?: string | null
          expires_at: string
          geo_latitude?: number | null
          geo_longitude?: number | null
          id?: string
          issued_at?: string | null
          local_proof_hash?: string | null
          nfc_anr_code_scanned?: string | null
          nfc_scan_at?: string | null
          nfc_serial_scanned?: string | null
          parcel_id?: string | null
          proof_type: string
          qr_scan_at?: string | null
          status?: string | null
          token_hash: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string | null
          emitter_id?: string
          emitter_type?: string
          expected_anr_id?: string | null
          expected_nfc_serial?: string | null
          expires_at?: string
          geo_latitude?: number | null
          geo_longitude?: number | null
          id?: string
          issued_at?: string | null
          local_proof_hash?: string | null
          nfc_anr_code_scanned?: string | null
          nfc_scan_at?: string | null
          nfc_serial_scanned?: string | null
          parcel_id?: string | null
          proof_type?: string
          qr_scan_at?: string | null
          status?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcel_qr_tokens_expected_anr_id_fkey"
            columns: ["expected_anr_id"]
            isOneToOne: false
            referencedRelation: "anrs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcel_qr_tokens_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      parcels: {
        Row: {
          carrier_id: string | null
          created_at: string | null
          declared_value: number | null
          delivered_at: string | null
          delivery_driver_id: string | null
          delivery_driver_name: string | null
          deposited_at: string | null
          description: string | null
          dimensions_cm: string | null
          estimated_delivery_at: string | null
          external_tracking_id: string | null
          id: string
          max_storage_until: string | null
          metadata: Json | null
          parcel_type: string | null
          picked_up_at: string | null
          recipient_anr_id: string | null
          recipient_email: string | null
          recipient_name: string
          recipient_phone: string | null
          recipient_user_id: string | null
          relay_point_id: string | null
          status: string
          tracking_number: string
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          carrier_id?: string | null
          created_at?: string | null
          declared_value?: number | null
          delivered_at?: string | null
          delivery_driver_id?: string | null
          delivery_driver_name?: string | null
          deposited_at?: string | null
          description?: string | null
          dimensions_cm?: string | null
          estimated_delivery_at?: string | null
          external_tracking_id?: string | null
          id?: string
          max_storage_until?: string | null
          metadata?: Json | null
          parcel_type?: string | null
          picked_up_at?: string | null
          recipient_anr_id?: string | null
          recipient_email?: string | null
          recipient_name: string
          recipient_phone?: string | null
          recipient_user_id?: string | null
          relay_point_id?: string | null
          status?: string
          tracking_number: string
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          carrier_id?: string | null
          created_at?: string | null
          declared_value?: number | null
          delivered_at?: string | null
          delivery_driver_id?: string | null
          delivery_driver_name?: string | null
          deposited_at?: string | null
          description?: string | null
          dimensions_cm?: string | null
          estimated_delivery_at?: string | null
          external_tracking_id?: string | null
          id?: string
          max_storage_until?: string | null
          metadata?: Json | null
          parcel_type?: string | null
          picked_up_at?: string | null
          recipient_anr_id?: string | null
          recipient_email?: string | null
          recipient_name?: string
          recipient_phone?: string | null
          recipient_user_id?: string | null
          relay_point_id?: string | null
          status?: string
          tracking_number?: string
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parcels_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcels_recipient_anr_id_fkey"
            columns: ["recipient_anr_id"]
            isOneToOne: false
            referencedRelation: "anrs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcels_relay_point_id_fkey"
            columns: ["relay_point_id"]
            isOneToOne: false
            referencedRelation: "relay_points"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_verifications: {
        Row: {
          created_at: string | null
          device_id: string | null
          event_token: string | null
          expires_at: string
          id: string
          phone_number: string
          signature: string
          started_at: string | null
          status: string | null
          user_id: string | null
          verification_code: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          event_token?: string | null
          expires_at: string
          id?: string
          phone_number: string
          signature: string
          started_at?: string | null
          status?: string | null
          user_id?: string | null
          verification_code: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          event_token?: string | null
          expires_at?: string
          id?: string
          phone_number?: string
          signature?: string
          started_at?: string | null
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
          avatar_url: string | null
          business_card_completed: boolean | null
          created_at: string | null
          device_id: string | null
          first_name: string | null
          iban: string | null
          id: string
          last_name: string | null
          migrated_conversations_count: number | null
          phone_number: string | null
          phone_verified: boolean | null
          referral_balance: number | null
          ringtone_uri: string | null
          updated_at: string | null
        }
        Insert: {
          allow_emergency_access?: boolean | null
          avatar_url?: string | null
          business_card_completed?: boolean | null
          created_at?: string | null
          device_id?: string | null
          first_name?: string | null
          iban?: string | null
          id: string
          last_name?: string | null
          migrated_conversations_count?: number | null
          phone_number?: string | null
          phone_verified?: boolean | null
          referral_balance?: number | null
          ringtone_uri?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_emergency_access?: boolean | null
          avatar_url?: string | null
          business_card_completed?: boolean | null
          created_at?: string | null
          device_id?: string | null
          first_name?: string | null
          iban?: string | null
          id?: string
          last_name?: string | null
          migrated_conversations_count?: number | null
          phone_number?: string | null
          phone_verified?: boolean | null
          referral_balance?: number | null
          ringtone_uri?: string | null
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
      referral_codes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_payouts: {
        Row: {
          amount: number
          created_at: string | null
          iban: string | null
          id: string
          payout_method: string | null
          processed_at: string | null
          referrals_count: number
          status: string | null
          stripe_transfer_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          iban?: string | null
          id?: string
          payout_method?: string | null
          processed_at?: string | null
          referrals_count: number
          status?: string | null
          stripe_transfer_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          iban?: string | null
          id?: string
          payout_method?: string | null
          processed_at?: string | null
          referrals_count?: number
          status?: string | null
          stripe_transfer_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_payouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          referral_code_id: string
          referred_id: string
          referrer_id: string
          reward_amount: number | null
          status: string | null
          subscription_paid_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referral_code_id: string
          referred_id: string
          referrer_id: string
          reward_amount?: number | null
          status?: string | null
          subscription_paid_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referral_code_id?: string
          referred_id?: string
          referrer_id?: string
          reward_amount?: number | null
          status?: string | null
          subscription_paid_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      relay_contracts: {
        Row: {
          accepted_terms: Json | null
          contract_html: string
          contract_template_id: string | null
          contract_version: number
          created_at: string | null
          id: string
          is_active: boolean | null
          relay_point_id: string
          signature_hash: string | null
          signed_at: string
          signer_ip: string | null
          signer_user_agent: string | null
          superseded_by: string | null
        }
        Insert: {
          accepted_terms?: Json | null
          contract_html: string
          contract_template_id?: string | null
          contract_version?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          relay_point_id: string
          signature_hash?: string | null
          signed_at?: string
          signer_ip?: string | null
          signer_user_agent?: string | null
          superseded_by?: string | null
        }
        Update: {
          accepted_terms?: Json | null
          contract_html?: string
          contract_template_id?: string | null
          contract_version?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          relay_point_id?: string
          signature_hash?: string | null
          signed_at?: string
          signer_ip?: string | null
          signer_user_agent?: string | null
          superseded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relay_contracts_relay_point_id_fkey"
            columns: ["relay_point_id"]
            isOneToOne: false
            referencedRelation: "relay_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relay_contracts_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "relay_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      relay_disputes: {
        Row: {
          created_at: string | null
          description: string
          dispute_type: string
          id: string
          opened_by: string
          parcel_id: string | null
          relay_point_id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          dispute_type: string
          id?: string
          opened_by: string
          parcel_id?: string | null
          relay_point_id: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          dispute_type?: string
          id?: string
          opened_by?: string
          parcel_id?: string | null
          relay_point_id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relay_disputes_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relay_disputes_relay_point_id_fkey"
            columns: ["relay_point_id"]
            isOneToOne: false
            referencedRelation: "relay_points"
            referencedColumns: ["id"]
          },
        ]
      }
      relay_earnings: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          parcel_id: string | null
          payout_id: string | null
          proof_id: string | null
          relay_point_id: string
          status: string
          transaction_type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          parcel_id?: string | null
          payout_id?: string | null
          proof_id?: string | null
          relay_point_id: string
          status?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          parcel_id?: string | null
          payout_id?: string | null
          proof_id?: string | null
          relay_point_id?: string
          status?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "relay_earnings_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relay_earnings_proof_id_fkey"
            columns: ["proof_id"]
            isOneToOne: false
            referencedRelation: "parcel_proofs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relay_earnings_relay_point_id_fkey"
            columns: ["relay_point_id"]
            isOneToOne: false
            referencedRelation: "relay_points"
            referencedColumns: ["id"]
          },
        ]
      }
      relay_payouts: {
        Row: {
          amount: number
          created_at: string | null
          details: Json | null
          id: string
          paid_at: string | null
          parcels_count: number
          period_end: string
          period_start: string
          relay_point_id: string
          status: string
          stripe_transfer_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          details?: Json | null
          id?: string
          paid_at?: string | null
          parcels_count?: number
          period_end: string
          period_start: string
          relay_point_id: string
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          details?: Json | null
          id?: string
          paid_at?: string | null
          parcels_count?: number
          period_end?: string
          period_start?: string
          relay_point_id?: string
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relay_payouts_relay_point_id_fkey"
            columns: ["relay_point_id"]
            isOneToOne: false
            referencedRelation: "relay_points"
            referencedColumns: ["id"]
          },
        ]
      }
      relay_points: {
        Row: {
          accepted_parcel_types: string[] | null
          address_proof_url: string | null
          anr_id: string
          availability_schedule: Json | null
          average_rating: number | null
          company_name: string | null
          contract_signed_at: string | null
          created_at: string | null
          current_capacity: number
          deposit_earnings: number | null
          display_name: string
          iban: string | null
          id: string
          id_document_url: string | null
          is_active: boolean | null
          is_verified: boolean | null
          legal_form: string | null
          legal_representative_name: string | null
          max_capacity: number
          pending_earnings: number | null
          phone: string | null
          pickup_earnings: number | null
          rate_per_deposit: number | null
          rate_per_pickup: number | null
          relay_address: string | null
          relay_type: Database["public"]["Enums"]["relay_type"] | null
          siret: string | null
          status: Database["public"]["Enums"]["relay_status"] | null
          suspended_at: string | null
          suspended_by: string | null
          suspended_reason: string | null
          total_earnings: number | null
          total_parcels_handled: number | null
          training_completed_at: string | null
          training_score: number | null
          updated_at: string | null
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          accepted_parcel_types?: string[] | null
          address_proof_url?: string | null
          anr_id: string
          availability_schedule?: Json | null
          average_rating?: number | null
          company_name?: string | null
          contract_signed_at?: string | null
          created_at?: string | null
          current_capacity?: number
          deposit_earnings?: number | null
          display_name: string
          iban?: string | null
          id?: string
          id_document_url?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          legal_form?: string | null
          legal_representative_name?: string | null
          max_capacity?: number
          pending_earnings?: number | null
          phone?: string | null
          pickup_earnings?: number | null
          rate_per_deposit?: number | null
          rate_per_pickup?: number | null
          relay_address?: string | null
          relay_type?: Database["public"]["Enums"]["relay_type"] | null
          siret?: string | null
          status?: Database["public"]["Enums"]["relay_status"] | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          total_earnings?: number | null
          total_parcels_handled?: number | null
          training_completed_at?: string | null
          training_score?: number | null
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          accepted_parcel_types?: string[] | null
          address_proof_url?: string | null
          anr_id?: string
          availability_schedule?: Json | null
          average_rating?: number | null
          company_name?: string | null
          contract_signed_at?: string | null
          created_at?: string | null
          current_capacity?: number
          deposit_earnings?: number | null
          display_name?: string
          iban?: string | null
          id?: string
          id_document_url?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          legal_form?: string | null
          legal_representative_name?: string | null
          max_capacity?: number
          pending_earnings?: number | null
          phone?: string | null
          pickup_earnings?: number | null
          rate_per_deposit?: number | null
          rate_per_pickup?: number | null
          relay_address?: string | null
          relay_type?: Database["public"]["Enums"]["relay_type"] | null
          siret?: string | null
          status?: Database["public"]["Enums"]["relay_status"] | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          total_earnings?: number | null
          total_parcels_handled?: number | null
          training_completed_at?: string | null
          training_score?: number | null
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relay_points_anr_id_fkey"
            columns: ["anr_id"]
            isOneToOne: true
            referencedRelation: "anrs"
            referencedColumns: ["id"]
          },
        ]
      }
      resident_contacts: {
        Row: {
          anr_code: string | null
          avatar_url: string | null
          company_name: string | null
          contact_type: string | null
          contact_user_id: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          habitation_id: string | null
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
          contact_user_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          habitation_id?: string | null
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
          contact_user_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          habitation_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "fk_resident_contacts_habitation"
            columns: ["habitation_id"]
            isOneToOne: false
            referencedRelation: "habitations"
            referencedColumns: ["id"]
          },
        ]
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
          receive_visitor_messages: boolean | null
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
          receive_visitor_messages?: boolean | null
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
          receive_visitor_messages?: boolean | null
          status?: Database["public"]["Enums"]["resident_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_residents_user_id_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      sent_documents: {
        Row: {
          error_message: string | null
          html_snapshot: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          recipient_user_id: string | null
          sent_at: string | null
          status: string | null
          subject: string
          template_key: string
        }
        Insert: {
          error_message?: string | null
          html_snapshot?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          template_key: string
        }
        Update: {
          error_message?: string | null
          html_snapshot?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_key?: string
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
      user_communication_reads: {
        Row: {
          communication_id: string
          id: string
          is_hidden: boolean | null
          read_at: string
          user_id: string
        }
        Insert: {
          communication_id: string
          id?: string
          is_hidden?: boolean | null
          read_at?: string
          user_id: string
        }
        Update: {
          communication_id?: string
          id?: string
          is_hidden?: boolean | null
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_communication_reads_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "admin_communications"
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
      user_devices: {
        Row: {
          created_at: string
          device_id: string
          device_name: string | null
          id: string
          is_primary: boolean | null
          last_used_at: string
          user_id: string
          verified_at: string
        }
        Insert: {
          created_at?: string
          device_id: string
          device_name?: string | null
          id?: string
          is_primary?: boolean | null
          last_used_at?: string
          user_id: string
          verified_at?: string
        }
        Update: {
          created_at?: string
          device_id?: string
          device_name?: string | null
          id?: string
          is_primary?: boolean | null
          last_used_at?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          title?: string
          type?: string
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
          anr_code: string | null
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
          show_email: boolean | null
          show_phone: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          anr_code?: string | null
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
          show_email?: boolean | null
          show_phone?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          anr_code?: string | null
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
          show_email?: boolean | null
          show_phone?: boolean | null
          updated_at?: string | null
          user_id?: string | null
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
        }
        Relationships: []
      }
      visitor_device_notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          device_id: string
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          device_id: string
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          device_id?: string
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
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
      find_habitation_by_email: {
        Args: { contact_email: string }
        Returns: string
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
      get_user_email_for_contact: {
        Args: { target_user_id: string }
        Returns: string
      }
      get_visitor_device_id: { Args: never; Returns: string }
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
      relay_status:
        | "draft"
        | "identity_verified"
        | "contract_signed"
        | "anr_assigned"
        | "training_validated"
        | "active"
        | "suspended"
      relay_type: "professional" | "individual"
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
      relay_status: [
        "draft",
        "identity_verified",
        "contract_signed",
        "anr_assigned",
        "training_validated",
        "active",
        "suspended",
      ],
      relay_type: ["professional", "individual"],
      resident_status: ["pending", "verified", "inactive"],
      sender_type: ["particulier", "societe", "collectivites"],
    },
  },
} as const
