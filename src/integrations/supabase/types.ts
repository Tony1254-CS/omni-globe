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
      achievements: {
        Row: {
          code: string
          description: string
          icon: string
          title: string
        }
        Insert: {
          code: string
          description: string
          icon?: string
          title: string
        }
        Update: {
          code?: string
          description?: string
          icon?: string
          title?: string
        }
        Relationships: []
      }
      agent_runs: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          input: string
          output: string | null
          status: string
          steps: Json
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          input: string
          output?: string | null
          status?: string
          steps?: Json
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          input?: string
          output?: string | null
          status?: string
          steps?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          created_at: string
          description: string | null
          id: string
          model: string
          name: string
          system_prompt: string
          tools: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          model?: string
          name: string
          system_prompt: string
          tools?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          model?: string
          name?: string
          system_prompt?: string
          tools?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          comparator: string
          created_at: string
          enabled: boolean
          id: string
          kind: string
          label: string
          last_checked_at: string | null
          last_triggered_at: string | null
          last_value: number | null
          params: Json
          threshold: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comparator: string
          created_at?: string
          enabled?: boolean
          id?: string
          kind: string
          label: string
          last_checked_at?: string | null
          last_triggered_at?: string | null
          last_value?: number | null
          params?: Json
          threshold: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comparator?: string
          created_at?: string
          enabled?: boolean
          id?: string
          kind?: string
          label?: string
          last_checked_at?: string | null
          last_triggered_at?: string | null
          last_value?: number | null
          params?: Json
          threshold?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      automation_runs: {
        Row: {
          automation_id: string
          created_at: string
          detail: string | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          automation_id: string
          created_at?: string
          detail?: string | null
          id?: string
          status: string
          user_id: string
        }
        Update: {
          automation_id?: string
          created_at?: string
          detail?: string | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          action_kind: string
          action_params: Json
          created_at: string
          enabled: boolean
          id: string
          last_ran_at: string | null
          name: string
          trigger_kind: string
          trigger_params: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          action_kind: string
          action_params?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          last_ran_at?: string | null
          name: string
          trigger_kind: string
          trigger_params?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          action_kind?: string
          action_params?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          last_ran_at?: string | null
          name?: string
          trigger_kind?: string
          trigger_params?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      briefings: {
        Row: {
          content: string
          created_at: string
          id: string
          snapshot: Json
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          snapshot?: Json
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          snapshot?: Json
          user_id?: string
        }
        Relationships: []
      }
      client_errors: {
        Row: {
          created_at: string
          id: string
          message: string
          stack: string | null
          ua: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          stack?: string | null
          ua?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          stack?: string | null
          ua?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      device_readings: {
        Row: {
          device_id: string
          id: number
          recorded_at: string
          user_id: string
          value: number
        }
        Insert: {
          device_id: string
          id?: number
          recorded_at?: string
          user_id: string
          value: number
        }
        Update: {
          device_id?: string
          id?: number
          recorded_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "device_readings_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          created_at: string
          device_key: string
          hmac_secret: string
          id: string
          metric: string
          name: string
          unit: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_key: string
          hmac_secret: string
          id?: string
          metric?: string
          name: string
          unit?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_key?: string
          hmac_secret?: string
          id?: string
          metric?: string
          name?: string
          unit?: string | null
          user_id?: string
        }
        Relationships: []
      }
      favourite_locations: {
        Row: {
          created_at: string
          id: string
          label: string
          lat: number
          lon: number
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          lat: number
          lon: number
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          lat?: number
          lon?: number
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      journal: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          meta: Json
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          meta?: Json
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          meta?: Json
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_milestones: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string
          lat: number | null
          lon: number | null
          occurred_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          label: string
          lat?: number | null
          lon?: number | null
          occurred_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string
          lat?: number | null
          lon?: number | null
          occurred_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          home_label: string | null
          home_lat: number | null
          home_lon: number | null
          id: string
          timezone: string
          units: Database["public"]["Enums"]["unit_system"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          home_label?: string | null
          home_lat?: number | null
          home_lon?: number | null
          id: string
          timezone?: string
          units?: Database["public"]["Enums"]["unit_system"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          home_label?: string | null
          home_lat?: number | null
          home_lon?: number | null
          id?: string
          timezone?: string
          units?: Database["public"]["Enums"]["unit_system"]
          updated_at?: string
        }
        Relationships: []
      }
      provider_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          payload: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          payload: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          payload?: Json
        }
        Relationships: []
      }
      shared_dashboards: {
        Row: {
          created_at: string
          id: string
          slug: string
          snapshot: Json
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          slug: string
          snapshot: Json
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          slug?: string
          snapshot?: Json
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          code: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          code: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          code?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["code"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      widget_configs: {
        Row: {
          created_at: string
          h: number
          id: string
          settings: Json
          updated_at: string
          user_id: string
          w: number
          widget_type: string
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          h?: number
          id?: string
          settings?: Json
          updated_at?: string
          user_id: string
          w?: number
          widget_type: string
          x?: number
          y?: number
        }
        Update: {
          created_at?: string
          h?: number
          id?: string
          settings?: Json
          updated_at?: string
          user_id?: string
          w?: number
          widget_type?: string
          x?: number
          y?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      unit_system: "metric" | "imperial"
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
      unit_system: ["metric", "imperial"],
    },
  },
} as const
