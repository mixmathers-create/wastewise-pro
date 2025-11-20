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
      clients: {
        Row: {
          address: string | null
          collection_days: string[] | null
          collection_shift: string | null
          contact_info: string | null
          contact_number: string | null
          contact_person: string | null
          created_at: string
          id: string
          industry: string
          latitude: number | null
          longitude: number | null
          mt_requirement: number | null
          name: string
          qr_code: string
        }
        Insert: {
          address?: string | null
          collection_days?: string[] | null
          collection_shift?: string | null
          contact_info?: string | null
          contact_number?: string | null
          contact_person?: string | null
          created_at?: string
          id?: string
          industry: string
          latitude?: number | null
          longitude?: number | null
          mt_requirement?: number | null
          name: string
          qr_code: string
        }
        Update: {
          address?: string | null
          collection_days?: string[] | null
          collection_shift?: string | null
          contact_info?: string | null
          contact_number?: string | null
          contact_person?: string | null
          created_at?: string
          id?: string
          industry?: string
          latitude?: number | null
          longitude?: number | null
          mt_requirement?: number | null
          name?: string
          qr_code?: string
        }
        Relationships: []
      }
      collection_receipts: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          driver_id: string
          helper_ids: string[]
          id: string
          items: Json
          pdf_url: string | null
          qr_code: string
          signature_data: string | null
          signed_by: string | null
          truck_id: string
          waste_types: string[]
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          driver_id: string
          helper_ids: string[]
          id?: string
          items: Json
          pdf_url?: string | null
          qr_code: string
          signature_data?: string | null
          signed_by?: string | null
          truck_id: string
          waste_types: string[]
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          driver_id?: string
          helper_ids?: string[]
          id?: string
          items?: Json
          pdf_url?: string | null
          qr_code?: string
          signature_data?: string | null
          signed_by?: string | null
          truck_id?: string
          waste_types?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "collection_receipts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_receipts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_receipts_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          availability: Json | null
          birthdate: string | null
          contact_number: string | null
          created_at: string
          id: string
          id_number: string | null
          license_expiry_date: string | null
          license_file_url: string | null
          license_number: string | null
          name: string
          status: string | null
          suspension_end_date: string | null
          suspension_start_date: string | null
        }
        Insert: {
          availability?: Json | null
          birthdate?: string | null
          contact_number?: string | null
          created_at?: string
          id?: string
          id_number?: string | null
          license_expiry_date?: string | null
          license_file_url?: string | null
          license_number?: string | null
          name: string
          status?: string | null
          suspension_end_date?: string | null
          suspension_start_date?: string | null
        }
        Update: {
          availability?: Json | null
          birthdate?: string | null
          contact_number?: string | null
          created_at?: string
          id?: string
          id_number?: string | null
          license_expiry_date?: string | null
          license_file_url?: string | null
          license_number?: string | null
          name?: string
          status?: string | null
          suspension_end_date?: string | null
          suspension_start_date?: string | null
        }
        Relationships: []
      }
      equipment_checkouts: {
        Row: {
          assigned_to_type: string
          checked_in_at: string | null
          checked_out_at: string
          created_at: string
          driver_id: string | null
          equipment_id: string
          helper_id: string | null
          id: string
          notes: string | null
          quantity: number | null
          status: string | null
        }
        Insert: {
          assigned_to_type: string
          checked_in_at?: string | null
          checked_out_at?: string
          created_at?: string
          driver_id?: string | null
          equipment_id: string
          helper_id?: string | null
          id?: string
          notes?: string | null
          quantity?: number | null
          status?: string | null
        }
        Update: {
          assigned_to_type?: string
          checked_in_at?: string | null
          checked_out_at?: string
          created_at?: string
          driver_id?: string | null
          equipment_id?: string
          helper_id?: string | null
          id?: string
          notes?: string | null
          quantity?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_checkouts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_checkouts_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_checkouts_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "helpers"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_inventory: {
        Row: {
          code: string
          created_at: string
          id: string
          is_consumable: boolean | null
          name: string
          quantity: number | null
          status: string | null
          type: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_consumable?: boolean | null
          name: string
          quantity?: number | null
          status?: string | null
          type: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_consumable?: boolean | null
          name?: string
          quantity?: number | null
          status?: string | null
          type?: string
        }
        Relationships: []
      }
      helpers: {
        Row: {
          availability: Json | null
          birthdate: string | null
          contact_number: string | null
          created_at: string
          id: string
          id_number: string | null
          name: string
          status: string | null
          suspension_end_date: string | null
          suspension_start_date: string | null
        }
        Insert: {
          availability?: Json | null
          birthdate?: string | null
          contact_number?: string | null
          created_at?: string
          id?: string
          id_number?: string | null
          name: string
          status?: string | null
          suspension_end_date?: string | null
          suspension_start_date?: string | null
        }
        Update: {
          availability?: Json | null
          birthdate?: string | null
          contact_number?: string | null
          created_at?: string
          id?: string
          id_number?: string | null
          name?: string
          status?: string | null
          suspension_end_date?: string | null
          suspension_start_date?: string | null
        }
        Relationships: []
      }
      job_orders: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          job_number: string
          mechanic_id: string | null
          priority: string | null
          scheduled_date: string | null
          status: string | null
          title: string
          truck_id: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          job_number: string
          mechanic_id?: string | null
          priority?: string | null
          scheduled_date?: string | null
          status?: string | null
          title: string
          truck_id?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          job_number?: string
          mechanic_id?: string | null
          priority?: string | null
          scheduled_date?: string | null
          status?: string | null
          title?: string
          truck_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_orders_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_orders_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanic_consumable_checkouts: {
        Row: {
          checked_out_at: string | null
          checked_out_by_user_id: string | null
          consumable_id: string
          created_at: string | null
          id: string
          job_order_id: string
          mechanic_id: string
          notes: string | null
          quantity_used: number
          truck_id: string
        }
        Insert: {
          checked_out_at?: string | null
          checked_out_by_user_id?: string | null
          consumable_id: string
          created_at?: string | null
          id?: string
          job_order_id: string
          mechanic_id: string
          notes?: string | null
          quantity_used: number
          truck_id: string
        }
        Update: {
          checked_out_at?: string | null
          checked_out_by_user_id?: string | null
          consumable_id?: string
          created_at?: string | null
          id?: string
          job_order_id?: string
          mechanic_id?: string
          notes?: string | null
          quantity_used?: number
          truck_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mechanic_consumable_checkouts_consumable_id_fkey"
            columns: ["consumable_id"]
            isOneToOne: false
            referencedRelation: "mechanic_consumables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_consumable_checkouts_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_consumable_checkouts_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_consumable_checkouts_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanic_consumables: {
        Row: {
          category: string
          code: string
          created_at: string | null
          id: string
          min_stock_level: number | null
          name: string
          quantity: number | null
          status: string | null
          unit: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          id?: string
          min_stock_level?: number | null
          name: string
          quantity?: number | null
          status?: string | null
          unit: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          id?: string
          min_stock_level?: number | null
          name?: string
          quantity?: number | null
          status?: string | null
          unit?: string
        }
        Relationships: []
      }
      mechanic_time_logs: {
        Row: {
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          mechanic_id: string
          photo_url: string | null
          time_in: string
          time_out: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          mechanic_id: string
          photo_url?: string | null
          time_in?: string
          time_out?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          mechanic_id?: string
          photo_url?: string | null
          time_in?: string
          time_out?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mechanic_time_logs_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanics: {
        Row: {
          availability: Json | null
          birthdate: string | null
          contact_number: string | null
          created_at: string
          id: string
          id_number: string | null
          name: string
          status: string | null
          suspension_end_date: string | null
          suspension_start_date: string | null
        }
        Insert: {
          availability?: Json | null
          birthdate?: string | null
          contact_number?: string | null
          created_at?: string
          id?: string
          id_number?: string | null
          name: string
          status?: string | null
          suspension_end_date?: string | null
          suspension_start_date?: string | null
        }
        Update: {
          availability?: Json | null
          birthdate?: string | null
          contact_number?: string | null
          created_at?: string
          id?: string
          id_number?: string | null
          name?: string
          status?: string | null
          suspension_end_date?: string | null
          suspension_start_date?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          client_ids: string[] | null
          client_mt_allocations: Json | null
          created_at: string | null
          date: string
          device_fingerprint: string | null
          driver_id: string | null
          helper_ids: string[]
          id: string
          is_backup: boolean | null
          is_special_dispatch: boolean | null
          mt_requirement: number | null
          shift: string
          signature_data: string | null
          status: string | null
          truck_id: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          client_ids?: string[] | null
          client_mt_allocations?: Json | null
          created_at?: string | null
          date: string
          device_fingerprint?: string | null
          driver_id?: string | null
          helper_ids?: string[]
          id?: string
          is_backup?: boolean | null
          is_special_dispatch?: boolean | null
          mt_requirement?: number | null
          shift: string
          signature_data?: string | null
          status?: string | null
          truck_id?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          client_ids?: string[] | null
          client_mt_allocations?: Json | null
          created_at?: string | null
          date?: string
          device_fingerprint?: string | null
          driver_id?: string | null
          helper_ids?: string[]
          id?: string
          is_backup?: boolean | null
          is_special_dispatch?: boolean | null
          mt_requirement?: number | null
          shift?: string
          signature_data?: string | null
          status?: string | null
          truck_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_parameters: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          parameter_key: string
          parameter_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          parameter_key: string
          parameter_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          parameter_key?: string
          parameter_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      tool_checkouts: {
        Row: {
          checked_in_at: string | null
          checked_in_by_user_id: string | null
          checked_out_at: string
          checked_out_by_user_id: string | null
          checkin_photo_url: string | null
          created_at: string
          id: string
          job_order_id: string | null
          mechanic_id: string
          notes: string | null
          status: string | null
          tool_id: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by_user_id?: string | null
          checked_out_at?: string
          checked_out_by_user_id?: string | null
          checkin_photo_url?: string | null
          created_at?: string
          id?: string
          job_order_id?: string | null
          mechanic_id: string
          notes?: string | null
          status?: string | null
          tool_id: string
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by_user_id?: string | null
          checked_out_at?: string
          checked_out_by_user_id?: string | null
          checkin_photo_url?: string | null
          created_at?: string
          id?: string
          job_order_id?: string | null
          mechanic_id?: string
          notes?: string | null
          status?: string | null
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_checkouts_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_checkouts_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_checkouts_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          category: string | null
          code: string
          condition: string | null
          created_at: string
          id: string
          name: string
          status: string | null
        }
        Insert: {
          category?: string | null
          code: string
          condition?: string | null
          created_at?: string
          id?: string
          name: string
          status?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          condition?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: string | null
        }
        Relationships: []
      }
      truck_maintenance_blocks: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          reason: string | null
          start_date: string
          truck_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          truck_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          truck_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "truck_maintenance_blocks_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      trucks: {
        Row: {
          capacity: number | null
          code: string
          created_at: string
          id: string
          plate_number: string | null
          status: string | null
          type: string
        }
        Insert: {
          capacity?: number | null
          code: string
          created_at?: string
          id?: string
          plate_number?: string | null
          status?: string | null
          type: string
        }
        Update: {
          capacity?: number | null
          code?: string
          created_at?: string
          id?: string
          plate_number?: string | null
          status?: string | null
          type?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      get_expiring_licenses: {
        Args: never
        Returns: {
          days_until_expiry: number
          id: string
          license_expiry_date: string
          license_number: string
          name: string
        }[]
      }
      get_user_team_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
