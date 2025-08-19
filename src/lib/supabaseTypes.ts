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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      save_data: {
        Row: {
          all_solves: string | null
          minimal_solves: string | null
          priority_save_fraction: Database["public"]["CompositeTypes"]["unsafe_fraction"][] | null
          priority_save_percent: number[] | null
          save_data_id: string
          save_fraction:
            | Database["public"]["CompositeTypes"]["unsafe_fraction"]
            | null
          save_id: string
          save_percent: number | null
          stat_id: string
          status: Database["public"]["Enums"]["status"]
          true_minimal: boolean | null
        }
        Insert: {
          all_solves?: string | null
          minimal_solves?: string | null
          priority_save_fraction?: Database["public"]["CompositeTypes"]["unsafe_fraction"][] | null
          priority_save_percent?: number[] | null
          save_data_id?: string
          save_fraction?:
            | Database["public"]["CompositeTypes"]["unsafe_fraction"]
            | null
          save_id: string
          save_percent?: number | null
          stat_id: string
          status: Database["public"]["Enums"]["status"]
          true_minimal?: boolean | null
        }
        Update: {
          all_solves?: string | null
          minimal_solves?: string | null
          priority_save_fraction?: Database["public"]["CompositeTypes"]["unsafe_fraction"][] | null
          priority_save_percent?: number[] | null
          save_data_id?: string
          save_fraction?:
            | Database["public"]["CompositeTypes"]["unsafe_fraction"]
            | null
          save_id?: string
          save_percent?: number | null
          stat_id?: string
          status?: Database["public"]["Enums"]["status"]
          true_minimal?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "save_data_save_id_fkey"
            columns: ["save_id"]
            isOneToOne: false
            referencedRelation: "saves"
            referencedColumns: ["save_id"]
          },
          {
            foreignKeyName: "save_data_stat_id_fkey"
            columns: ["stat_id"]
            isOneToOne: false
            referencedRelation: "statistics"
            referencedColumns: ["stat_id"]
          },
        ]
      }
      save_translations: {
        Row: {
          language_code: string
          name: string
          save_id: string
        }
        Insert: {
          language_code?: string
          name: string
          save_id: string
        }
        Update: {
          language_code?: string
          name?: string
          save_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "save_translations_save_id_fkey"
            columns: ["save_id"]
            isOneToOne: false
            referencedRelation: "saves"
            referencedColumns: ["save_id"]
          },
        ]
      }
      saves: {
        Row: {
          auto_populate: boolean
          description: string | null
          gen_all_solves: boolean
          gen_minimal: boolean
          importance: number
          pc: number
          save: string
          save_id: string
        }
        Insert: {
          auto_populate?: boolean
          description?: string | null
          gen_all_solves?: boolean
          gen_minimal?: boolean
          importance: number
          pc: number
          save: string
          save_id?: string
        }
        Update: {
          auto_populate?: boolean
          description?: string | null
          gen_all_solves?: boolean
          gen_minimal?: boolean
          importance?: number
          pc?: number
          save?: string
          save_id?: string
        }
        Relationships: []
      }
      schema_metadata: {
        Row: {
          description: string
          updated_at: string | null
          version: string
        }
        Insert: {
          description: string
          updated_at?: string | null
          version: string
        }
        Update: {
          description?: string
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      set_paths: {
        Row: {
          set_id: number
          set_path: unknown | null
        }
        Insert: {
          set_id: number
          set_path?: unknown | null
        }
        Update: {
          set_id?: number
          set_path?: unknown | null
        }
        Relationships: [
          {
            foreignKeyName: "set_paths_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets"
            referencedColumns: ["set_id"]
          },
        ]
      }
      set_translations: {
        Row: {
          description: string
          language_code: string
          name: string
          set_id: number
        }
        Insert: {
          description: string
          language_code?: string
          name: string
          set_id: number
        }
        Update: {
          description?: string
          language_code?: string
          name?: string
          set_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "set_translations_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets"
            referencedColumns: ["set_id"]
          },
        ]
      }
      sets: {
        Row: {
          category: string | null
          set_id: number
        }
        Insert: {
          category?: string | null
          set_id?: number
        }
        Update: {
          category?: string | null
          set_id?: number
        }
        Relationships: []
      }
      setup_oqb_links: {
        Row: {
          child_id: string
          parent_id: string
        }
        Insert: {
          child_id: string
          parent_id: string
        }
        Update: {
          child_id?: string
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "setup_oqb_links_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "setups"
            referencedColumns: ["setup_id"]
          },
          {
            foreignKeyName: "setup_oqb_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "setups"
            referencedColumns: ["setup_id"]
          },
        ]
      }
      setup_oqb_paths: {
        Row: {
          oqb_path: unknown | null
          setup_id: string
        }
        Insert: {
          oqb_path?: unknown | null
          setup_id: string
        }
        Update: {
          oqb_path?: unknown | null
          setup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "setup_oqb_paths_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "setups"
            referencedColumns: ["setup_id"]
          },
        ]
      }
      setup_sets: {
        Row: {
          set_id: number
          setup_id: string
        }
        Insert: {
          set_id: number
          setup_id: string
        }
        Update: {
          set_id?: number
          setup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "setup_sets_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets"
            referencedColumns: ["set_id"]
          },
          {
            foreignKeyName: "setup_sets_set_id_fkey1"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets"
            referencedColumns: ["set_id"]
          },
        ]
      }
      setup_translations: {
        Row: {
          cover_description: string
          language_code: string
          setup_id: string
        }
        Insert: {
          cover_description: string
          language_code?: string
          setup_id: string
        }
        Update: {
          cover_description?: string
          language_code?: string
          setup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "setup_translations_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "setups"
            referencedColumns: ["setup_id"]
          },
        ]
      }
      setup_variants: {
        Row: {
          build: string
          fumen: string
          setup_id: string
          solve_pattern: string | null
          variant_number: number
        }
        Insert: {
          build: string
          fumen: string
          setup_id: string
          solve_pattern?: string | null
          variant_number: number
        }
        Update: {
          build?: string
          fumen?: string
          setup_id?: string
          solve_pattern?: string | null
          variant_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "setup_variants_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "setups"
            referencedColumns: ["setup_id"]
          },
          {
            foreignKeyName: "setup_variants_setup_id_fkey1"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "setups"
            referencedColumns: ["setup_id"]
          },
        ]
      }
      setups: {
        Row: {
          build: string
          cover_description: string | null
          cover_pattern: string
          credit: string | null
          fumen: string
          hold: number
          leftover: string
          mirror: string | null
          pc: number
          see: number
          setup_id: string
          solve_pattern: string | null
          type: Database["public"]["Enums"]["setup_type"]
        }
        Insert: {
          build: string
          cover_description?: string | null
          cover_pattern: string
          credit?: string | null
          fumen: string
          hold?: number
          leftover: string
          mirror?: string | null
          pc: number
          see?: number
          setup_id: string
          solve_pattern?: string | null
          type?: Database["public"]["Enums"]["setup_type"]
        }
        Update: {
          build?: string
          cover_description?: string | null
          cover_pattern?: string
          credit?: string | null
          fumen?: string
          hold?: number
          leftover?: string
          mirror?: string | null
          pc?: number
          see?: number
          setup_id?: string
          solve_pattern?: string | null
          type?: Database["public"]["Enums"]["setup_type"]
        }
        Relationships: [
          {
            foreignKeyName: "setups_mirror_fkey"
            columns: ["mirror"]
            isOneToOne: false
            referencedRelation: "setups"
            referencedColumns: ["setup_id"]
          },
        ]
      }
      statistics: {
        Row: {
          all_solves: string | null
          cover_data: string | null
          hold_type: Database["public"]["Enums"]["hold_type"]
          kicktable: Database["public"]["Enums"]["kicktable"]
          minimal_solves: string | null
          path_file: boolean
          setup_id: string
          solve_fraction:
            | Database["public"]["CompositeTypes"]["unsafe_fraction"]
            | null
          solve_percent: number | null
          stat_id: string
          true_minimal: boolean | null
        }
        Insert: {
          all_solves?: string | null
          cover_data?: string | null
          hold_type?: Database["public"]["Enums"]["hold_type"]
          kicktable: Database["public"]["Enums"]["kicktable"]
          minimal_solves?: string | null
          path_file?: boolean
          setup_id: string
          solve_fraction?:
            | Database["public"]["CompositeTypes"]["unsafe_fraction"]
            | null
          solve_percent?: number | null
          stat_id?: string
          true_minimal?: boolean | null
        }
        Update: {
          all_solves?: string | null
          cover_data?: string | null
          hold_type?: Database["public"]["Enums"]["hold_type"]
          kicktable?: Database["public"]["Enums"]["kicktable"]
          minimal_solves?: string | null
          path_file?: boolean
          setup_id?: string
          solve_fraction?:
            | Database["public"]["CompositeTypes"]["unsafe_fraction"]
            | null
          solve_percent?: number | null
          stat_id?: string
          true_minimal?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "statistics_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "setups"
            referencedColumns: ["setup_id"]
          },
        ]
      }
      users: {
        Row: {
          active: boolean
          admin: boolean
          auth_id: string | null
          editor: boolean
          email: string
          user_id: string
          username: string
        }
        Insert: {
          active?: boolean
          admin?: boolean
          auth_id?: string | null
          editor?: boolean
          email: string
          user_id?: string
          username: string
        }
        Update: {
          active?: boolean
          admin?: boolean
          auth_id?: string | null
          editor?: boolean
          email?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_set_edge: {
        Args: { child_id: number; parent_id: number }
        Returns: undefined
      }
      add_setup_edge: {
        Args: { child_id: unknown; parent_id: unknown }
        Returns: undefined
      }
      all_decimals_lte_100: {
        Args: { arr: number[] }
        Returns: boolean
      }
      auth_hook_add_user_info: {
        Args: { event: Json }
        Returns: Json
      }
      delete_set_edge: {
        Args: { child_id: number; parent_id: number }
        Returns: undefined
      }
      delete_setup_edge: {
        Args: { child_id: unknown; parent_id: unknown }
        Returns: undefined
      }
      find_setup_leftover: {
        Args: {
          hold_type?: Database["public"]["Enums"]["hold_type"]
          kicktable?: Database["public"]["Enums"]["kicktable"]
          language?: string
          p_leftover: unknown
        }
        Returns: {
          build: unknown
          cover_data: string
          cover_description: string
          cover_pattern: string
          credit: string
          fumen: unknown
          hold: number
          leftover: unknown
          minimal_solves: unknown
          mirror: unknown
          pc: number
          saves: Database["public"]["CompositeTypes"]["setup_saves_data"][]
          see: number
          setup_id: unknown
          solve_fraction: unknown
          solve_pattern: string
          solve_percent: number
          type: Database["public"]["Enums"]["setup_type"]
          variants: Database["public"]["CompositeTypes"]["setup_variants_data"][]
        }[]
      }
      find_setup_parent_id: {
        Args: {
          hold_type?: Database["public"]["Enums"]["hold_type"]
          kicktable?: Database["public"]["Enums"]["kicktable"]
          language?: string
          parent_id: unknown
        }
        Returns: {
          build: unknown
          cover_data: string
          cover_description: string
          cover_pattern: string
          credit: string
          fumen: unknown
          hold: number
          leftover: unknown
          minimal_solves: unknown
          mirror: unknown
          pc: number
          saves: Database["public"]["CompositeTypes"]["setup_saves_data"][]
          see: number
          setup_id: unknown
          solve_fraction: unknown
          solve_pattern: string
          solve_percent: number
          type: Database["public"]["Enums"]["setup_type"]
          variants: Database["public"]["CompositeTypes"]["setup_variants_data"][]
        }[]
      }
      find_setup_setup_id: {
        Args: {
          hold_type?: Database["public"]["Enums"]["hold_type"]
          kicktable?: Database["public"]["Enums"]["kicktable"]
          language?: string
          p_setup_id: unknown
        }
        Returns: {
          build: unknown
          cover_data: string
          cover_description: string
          cover_pattern: string
          credit: string
          fumen: unknown
          hold: number
          leftover: unknown
          minimal_solves: unknown
          mirror: unknown
          pc: number
          saves: Database["public"]["CompositeTypes"]["setup_saves_data"][]
          see: number
          setup_id: unknown
          solve_fraction: unknown
          solve_pattern: string
          solve_percent: number
          type: Database["public"]["Enums"]["setup_type"]
          variants: Database["public"]["CompositeTypes"]["setup_variants_data"][]
        }[]
      }
      find_uncalculated_saves: {
        Args: { max_rows?: number }
        Returns: {
          auto_populate: boolean
          build: unknown
          description: string
          fumen: unknown
          gen_all_solves: boolean
          gen_minimal: boolean
          hold: number
          hold_type: Database["public"]["Enums"]["hold_type"]
          kicktable: Database["public"]["Enums"]["kicktable"]
          leftover: unknown
          pc: number
          save: string
          save_id: string
          setup_id: unknown
          stat_id: string
        }[]
      }
      has_admin_permission: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      has_edit_permission: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_valid_fraction_array: {
        Args: { arr: unknown[] }
        Returns: boolean
      }
      print_oqb_as_dot: {
        Args: { start_path?: unknown }
        Returns: string
      }
      print_sets_as_dot: {
        Args: { start_path?: unknown }
        Returns: string
      }
    }
    Enums: {
      hold_type: "any" | "cyclic" | "none"
      kicktable:
        | "srs"
        | "srs_plus"
        | "srsx"
        | "srs180"
        | "tetrax"
        | "asc"
        | "ars"
        | "none"
      setup_type: "regular" | "qb" | "oqb"
      status: "processing" | "completed" | "failed"
    }
    CompositeTypes: {
      setup_saves_data: {
        save: string | null
        name: string | null
        save_percent: number | null
        save_fraction: Database["public"]["CompositeTypes"]["unsafe_fraction"] | null
        priority_save_percent: number[] | null
        priority_save_fraction: Database["public"]["CompositeTypes"]["unsafe_fraction"][] | null
        all_solves: string | null
        minimal_solves: string | null
        true_minimal: boolean | null
      }
      setup_variants_data: {
        variant_number: number | null
        build: string | null
        fumen: string | null
        solve_pattern: string | null
      }
      unsafe_fraction: {
        numerator: number | null
        denominator: number | null
      }
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
      hold_type: ["any", "cyclic", "none"],
      kicktable: [
        "srs",
        "srs_plus",
        "srsx",
        "srs180",
        "tetrax",
        "asc",
        "ars",
        "none",
      ],
      setup_type: ["regular", "qb", "oqb"],
      status: ["processing", "completed", "failed"],
    },
  },
} as const
