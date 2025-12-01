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
      anrs: {
        Row: {
          address: string
          code: string
          created_at: string | null
          id: string
          latitude: number
          longitude: number
          updated_at: string | null
        }
        Insert: {
          address: string
          code: string
          created_at?: string | null
          id?: string
          latitude: number
          longitude: number
          updated_at?: string | null
        }
        Update: {
          address?: string
          code?: string
          created_at?: string | null
          id?: string
          latitude?: number
          longitude?: number
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
          phone_number: string
          phone_verified: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone_number: string
          phone_verified?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string
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
      app_role: "admin" | "moderator" | "user"
      resident_status: "pending" | "verified" | "inactive"
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
      app_role: ["admin", "moderator", "user"],
      resident_status: ["pending", "verified", "inactive"],
    },
  },
} as const
