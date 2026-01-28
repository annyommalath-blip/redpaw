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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      care_applications: {
        Row: {
          applicant_id: string
          availability_text: string
          created_at: string
          id: string
          message: string
          rate_offered: string | null
          request_id: string
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          applicant_id: string
          availability_text: string
          created_at?: string
          id?: string
          message: string
          rate_offered?: string | null
          request_id: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          availability_text?: string
          created_at?: string
          id?: string
          message?: string
          rate_offered?: string | null
          request_id?: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_applications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "care_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      care_requests: {
        Row: {
          assigned_sitter_id: string | null
          care_type: Database["public"]["Enums"]["care_type"]
          created_at: string
          dog_id: string
          id: string
          location_text: string
          notes: string | null
          owner_id: string
          pay_offered: string | null
          status: Database["public"]["Enums"]["request_status"]
          time_window: string
          updated_at: string
        }
        Insert: {
          assigned_sitter_id?: string | null
          care_type: Database["public"]["Enums"]["care_type"]
          created_at?: string
          dog_id: string
          id?: string
          location_text: string
          notes?: string | null
          owner_id: string
          pay_offered?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          time_window: string
          updated_at?: string
        }
        Update: {
          assigned_sitter_id?: string | null
          care_type?: Database["public"]["Enums"]["care_type"]
          created_at?: string
          dog_id?: string
          id?: string
          location_text?: string
          notes?: string | null
          owner_id?: string
          pay_offered?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          time_window?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_requests_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          context_id: string | null
          context_type: string | null
          created_at: string
          id: string
          last_message: string | null
          participant_ids: string[]
          updated_at: string
        }
        Insert: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          participant_ids: string[]
          updated_at?: string
        }
        Update: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          participant_ids?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      dogs: {
        Row: {
          age: string | null
          breed: string | null
          created_at: string
          date_of_birth: string | null
          id: string
          is_lost: boolean
          name: string
          notes: string | null
          owner_id: string
          photo_url: string | null
          photo_urls: string[] | null
          updated_at: string
          weight: string | null
          weight_unit: string | null
        }
        Insert: {
          age?: string | null
          breed?: string | null
          created_at?: string
          date_of_birth?: string | null
          id?: string
          is_lost?: boolean
          name: string
          notes?: string | null
          owner_id: string
          photo_url?: string | null
          photo_urls?: string[] | null
          updated_at?: string
          weight?: string | null
          weight_unit?: string | null
        }
        Update: {
          age?: string | null
          breed?: string | null
          created_at?: string
          date_of_birth?: string | null
          id?: string
          is_lost?: boolean
          name?: string
          notes?: string | null
          owner_id?: string
          photo_url?: string | null
          photo_urls?: string[] | null
          updated_at?: string
          weight?: string | null
          weight_unit?: string | null
        }
        Relationships: []
      }
      health_logs: {
        Row: {
          created_at: string
          dog_id: string
          id: string
          log_type: Database["public"]["Enums"]["log_type"]
          notes: string | null
          owner_id: string
          value: string | null
        }
        Insert: {
          created_at?: string
          dog_id: string
          id?: string
          log_type: Database["public"]["Enums"]["log_type"]
          notes?: string | null
          owner_id: string
          value?: string | null
        }
        Update: {
          created_at?: string
          dog_id?: string
          id?: string
          log_type?: Database["public"]["Enums"]["log_type"]
          notes?: string | null
          owner_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_logs_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_alerts: {
        Row: {
          created_at: string
          description: string
          dog_id: string
          id: string
          last_seen_location: string
          owner_id: string
          photo_url: string | null
          status: Database["public"]["Enums"]["alert_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          dog_id: string
          id?: string
          last_seen_location: string
          owner_id: string
          photo_url?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          dog_id?: string
          id?: string
          last_seen_location?: string
          owner_id?: string
          photo_url?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lost_alerts_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      med_records: {
        Row: {
          created_at: string
          date_given: string
          dog_id: string
          duration_unit: Database["public"]["Enums"]["duration_unit"]
          duration_value: number
          expires_on: string
          id: string
          name: string
          notes: string | null
          owner_id: string
          record_type: Database["public"]["Enums"]["med_record_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_given: string
          dog_id: string
          duration_unit: Database["public"]["Enums"]["duration_unit"]
          duration_value: number
          expires_on: string
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          record_type: Database["public"]["Enums"]["med_record_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_given?: string
          dog_id?: string
          duration_unit?: Database["public"]["Enums"]["duration_unit"]
          duration_value?: number
          expires_on?: string
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          record_type?: Database["public"]["Enums"]["med_record_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "med_records_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
          text: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
          text: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sightings: {
        Row: {
          alert_id: string
          created_at: string
          id: string
          location_text: string | null
          message: string
          reporter_id: string
        }
        Insert: {
          alert_id: string
          created_at?: string
          id?: string
          location_text?: string | null
          message: string
          reporter_id: string
        }
        Update: {
          alert_id?: string
          created_at?: string
          id?: string
          location_text?: string | null
          message?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sightings_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "lost_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      sitter_logs: {
        Row: {
          created_at: string
          dog_id: string
          id: string
          log_type: Database["public"]["Enums"]["sitter_log_type"]
          media_urls: string[] | null
          note_text: string | null
          owner_id: string
          request_id: string
          sitter_id: string
        }
        Insert: {
          created_at?: string
          dog_id: string
          id?: string
          log_type: Database["public"]["Enums"]["sitter_log_type"]
          media_urls?: string[] | null
          note_text?: string | null
          owner_id: string
          request_id: string
          sitter_id: string
        }
        Update: {
          created_at?: string
          dog_id?: string
          id?: string
          log_type?: Database["public"]["Enums"]["sitter_log_type"]
          media_urls?: string[] | null
          note_text?: string | null
          owner_id?: string
          request_id?: string
          sitter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sitter_logs_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sitter_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "care_requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      alert_status: "active" | "resolved"
      application_status: "pending" | "approved" | "declined" | "withdrawn"
      care_type: "walk" | "watch" | "overnight" | "check-in"
      duration_unit: "days" | "months" | "years"
      log_type: "walk" | "food" | "meds" | "mood" | "symptom"
      med_record_type: "vaccine" | "medication"
      request_status: "open" | "closed"
      sitter_log_type: "walk" | "meal" | "potty" | "play" | "note"
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
      alert_status: ["active", "resolved"],
      application_status: ["pending", "approved", "declined", "withdrawn"],
      care_type: ["walk", "watch", "overnight", "check-in"],
      duration_unit: ["days", "months", "years"],
      log_type: ["walk", "food", "meds", "mood", "symptom"],
      med_record_type: ["vaccine", "medication"],
      request_status: ["open", "closed"],
      sitter_log_type: ["walk", "meal", "potty", "play", "note"],
    },
  },
} as const
