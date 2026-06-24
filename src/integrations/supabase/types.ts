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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
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
          job_status: string | null
          lat: number | null
          lng: number | null
          notes: string | null
          operational_status: string | null
          permission_id: string | null
          report_date: string
          report_month: number
          report_year: number
          selfie_url: string | null
          submitted_via: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          job_status?: string | null
          lat?: number | null
          lng?: number | null
          notes?: string | null
          operational_status?: string | null
          permission_id?: string | null
          report_date?: string
          report_month: number
          report_year: number
          selfie_url?: string | null
          submitted_via?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          job_status?: string | null
          lat?: number | null
          lng?: number | null
          notes?: string | null
          operational_status?: string | null
          permission_id?: string | null
          report_date?: string
          report_month?: number
          report_year?: number
          selfie_url?: string | null
          submitted_via?: string | null
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
      reporting_permissions: {
        Row: {
          client_id: string
          created_at: string
          granted_at: string
          id: string
          note: string | null
          pegawai_id: string
          period_month: number
          period_year: number
          revoked_at: string | null
          updated_at: string
          used_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          granted_at?: string
          id?: string
          note?: string | null
          pegawai_id: string
          period_month: number
          period_year: number
          revoked_at?: string | null
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          granted_at?: string
          id?: string
          note?: string | null
          pegawai_id?: string
          period_month?: number
          period_year?: number
          revoked_at?: string | null
          updated_at?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reporting_permissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_integration_settings: {
        Row: {
          auto_sync: boolean
          clients_sheet_name: string
          column_mapping: Json
          created_at: string
          created_by: string | null
          id: string
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          permissions_sheet_name: string
          reports_sheet_name: string
          spreadsheet_id: string
          spreadsheet_url: string | null
          updated_at: string
        }
        Insert: {
          auto_sync?: boolean
          clients_sheet_name?: string
          column_mapping?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          permissions_sheet_name?: string
          reports_sheet_name?: string
          spreadsheet_id: string
          spreadsheet_url?: string | null
          updated_at?: string
        }
        Update: {
          auto_sync?: boolean
          clients_sheet_name?: string
          column_mapping?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          permissions_sheet_name?: string
          reports_sheet_name?: string
          spreadsheet_id?: string
          spreadsheet_url?: string | null
          updated_at?: string
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
      get_client_permission_status: {
        Args: { _client_id: string }
        Returns: {
          already_reported: boolean
          assigned_pk_name: string
          case_number: string
          client_id: string
          full_name: string
          has_permission: boolean
          period_month: number
          period_year: number
          permission_id: string
        }[]
      }
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
      has_role_any: { Args: { _user_id: string }; Returns: string }
      search_clients_public: {
        Args: { _q: string }
        Returns: {
          assigned_pk_name: string
          case_number: string
          full_name: string
          id: string
        }[]
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
