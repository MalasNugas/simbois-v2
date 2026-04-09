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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          assigned_pk_id: string | null
          case_number: string | null
          client_status: string | null
          created_at: string | null
          employment_details: string | null
          employment_status:
            | Database["public"]["Enums"]["employment_status"]
            | null
          guidance_end: string | null
          guidance_start: string | null
          guidance_status: Database["public"]["Enums"]["guidance_status"] | null
          id: string
          referred_to_disnaker: boolean | null
          training_needs: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_pk_id?: string | null
          case_number?: string | null
          client_status?: string | null
          created_at?: string | null
          employment_details?: string | null
          employment_status?:
            | Database["public"]["Enums"]["employment_status"]
            | null
          guidance_end?: string | null
          guidance_start?: string | null
          guidance_status?:
            | Database["public"]["Enums"]["guidance_status"]
            | null
          id?: string
          referred_to_disnaker?: boolean | null
          training_needs?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_pk_id?: string | null
          case_number?: string | null
          client_status?: string | null
          created_at?: string | null
          employment_details?: string | null
          employment_status?:
            | Database["public"]["Enums"]["employment_status"]
            | null
          guidance_end?: string | null
          guidance_start?: string | null
          guidance_status?:
            | Database["public"]["Enums"]["guidance_status"]
            | null
          id?: string
          referred_to_disnaker?: boolean | null
          training_needs?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      location_tracking: {
        Row: {
          accuracy: number | null
          id: string
          latitude: number
          longitude: number
          tracked_at: string | null
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          id?: string
          latitude: number
          longitude: number
          tracked_at?: string | null
          user_id: string
        }
        Update: {
          accuracy?: number | null
          id?: string
          latitude?: number
          longitude?: number
          tracked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      monthly_reports: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          notes: string | null
          report_date: string
          report_month: number
          report_year: number
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          report_date?: string
          report_month: number
          report_year: number
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          report_date?: string
          report_month?: number
          report_year?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          birth_date: string | null
          birth_place: string | null
          created_at: string | null
          full_name: string
          gender: string | null
          id: string
          is_verified: boolean | null
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string | null
          full_name: string
          gender?: string | null
          id?: string
          is_verified?: boolean | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_verified?: boolean | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      program_registrations: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          program_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["registration_status"] | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          program_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["registration_status"] | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          program_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["registration_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "program_registrations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          file_url: string | null
          id: string
          is_open: boolean | null
          name: string
          program_type: string
          quota: number | null
          schedule_date: string | null
          schedule_end: string | null
          trainer_info: string | null
          trainer_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          is_open?: boolean | null
          name: string
          program_type: string
          quota?: number | null
          schedule_date?: string | null
          schedule_end?: string | null
          trainer_info?: string | null
          trainer_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          is_open?: boolean | null
          name?: string
          program_type?: string
          quota?: number | null
          schedule_date?: string | null
          schedule_end?: string | null
          trainer_info?: string | null
          trainer_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      termination_reports: {
        Row: {
          approval_status: string
          client_id: string
          created_at: string | null
          file_url: string | null
          id: string
          notes: string | null
          pegawai_id: string
          report_date: string
        }
        Insert: {
          approval_status?: string
          client_id: string
          created_at?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          pegawai_id: string
          report_date?: string
        }
        Update: {
          approval_status?: string
          client_id?: string
          created_at?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          pegawai_id?: string
          report_date?: string
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
      get_pegawai_list: {
        Args: never
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "klien" | "pegawai" | "admin"
      employment_status: "belum_bekerja" | "sedang_pelatihan" | "sudah_bekerja"
      guidance_status: "aktif" | "selesai" | "tidak_aktif"
      registration_status: "pending" | "approved" | "rejected"
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
      app_role: ["klien", "pegawai", "admin"],
      employment_status: ["belum_bekerja", "sedang_pelatihan", "sudah_bekerja"],
      guidance_status: ["aktif", "selesai", "tidak_aktif"],
      registration_status: ["pending", "approved", "rejected"],
    },
  },
} as const
