export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      save_data: {
        Row: {
          all_solves: string | null
          minimal_solves: string | null
          priority_save_fraction: unknown[] | null
          priority_save_percent: number[] | null
          save_data_id: string
          save_fraction:
            | Database["public"]["CompositeTypes"]["unsafe_fraction"]
            | null
          save_id: string
          save_percent: number | null
          stat_id: string
          status: Database["public"]["Enums"]["status"]
        }
        Insert: {
          all_solves?: string | null
          minimal_solves?: string | null
          priority_save_fraction?: unknown[] | null
          priority_save_percent?: number[] | null
          save_data_id?: string
          save_fraction?:
            | Database["public"]["CompositeTypes"]["unsafe_fraction"]
            | null
          save_id: string
          save_percent?: number | null
          stat_id: string
          status: Database["public"]["Enums"]["status"]
        }
        Update: {
          all_solves?: string | null
          minimal_solves?: string | null
          priority_save_fraction?: unknown[] | null
          priority_save_percent?: number[] | null
          save_data_id?: string
          save_fraction?:
            | Database["public"]["CompositeTypes"]["unsafe_fraction"]
            | null
          save_id?: string
          save_percent?: number | null
          stat_id?: string
          status?: Database["public"]["Enums"]["status"]
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
      saves: {
        Row: {
          auto_populate: boolean
          description: string | null
          gen_all_solves: boolean
          gen_minimal: boolean
          pc: number
          save: string
          save_id: string
        }
        Insert: {
          auto_populate?: boolean
          description?: string | null
          gen_all_solves?: boolean
          gen_minimal?: boolean
          pc: number
          save: string
          save_id?: string
        }
        Update: {
          auto_populate?: boolean
          description?: string | null
          gen_all_solves?: boolean
          gen_minimal?: boolean
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
          oqb_depth: number | null
          oqb_path: unknown | null
          pc: number
          see: number
          setup_id: string
          solve_pattern: string | null
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
          oqb_depth?: number | null
          oqb_path?: unknown | null
          pc: number
          see?: number
          setup_id: string
          solve_pattern?: string | null
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
          oqb_depth?: number | null
          oqb_path?: unknown | null
          pc?: number
          see?: number
          setup_id?: string
          solve_pattern?: string | null
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
      all_decimals_lte_100: {
        Args: { arr: number[] }
        Returns: boolean
      }
      auth_hook_add_user_info: {
        Args: { event: Json }
        Returns: Json
      }
      find_setup_leftover: {
        Args: {
          p_leftover: unknown
          kicktable?: Database["public"]["Enums"]["kicktable"]
          hold_type?: Database["public"]["Enums"]["hold_type"]
        }
        Returns: {
          setup_id: unknown
          pc: number
          leftover: unknown
          build: unknown
          cover_pattern: string
          oqb_path: unknown
          oqb_depth: number
          cover_description: string
          fumen: unknown
          solve_pattern: string
          mirror: unknown
          see: number
          hold: number
          credit: string
          cover_data: string
          solve_percent: number
          solve_fraction: unknown
          minimal_solves: unknown
          variants: Database["public"]["CompositeTypes"]["setup_variants_data"][]
        }[]
      }
      find_setup_parent_id: {
        Args: {
          parent_id: unknown
          kicktable?: Database["public"]["Enums"]["kicktable"]
          hold_type?: Database["public"]["Enums"]["hold_type"]
        }
        Returns: {
          setup_id: unknown
          pc: number
          leftover: unknown
          build: unknown
          cover_pattern: string
          oqb_path: unknown
          oqb_depth: number
          cover_description: string
          fumen: unknown
          solve_pattern: string
          mirror: unknown
          see: number
          hold: number
          credit: string
          cover_data: string
          solve_percent: number
          solve_fraction: unknown
          minimal_solves: unknown
          variants: Database["public"]["CompositeTypes"]["setup_variants_data"][]
        }[]
      }
      find_setup_setup_id: {
        Args: {
          p_setup_id: unknown
          kicktable?: Database["public"]["Enums"]["kicktable"]
          hold_type?: Database["public"]["Enums"]["hold_type"]
        }
        Returns: {
          setup_id: unknown
          pc: number
          leftover: unknown
          build: unknown
          cover_pattern: string
          oqb_path: unknown
          oqb_depth: number
          cover_description: string
          fumen: unknown
          solve_pattern: string
          mirror: unknown
          see: number
          hold: number
          credit: string
          cover_data: string
          solve_percent: number
          solve_fraction: unknown
          minimal_solves: unknown
          variants: Database["public"]["CompositeTypes"]["setup_variants_data"][]
        }[]
      }
      find_uncalculated_saves: {
        Args: Record<PropertyKey, never>
        Returns: {
          setup_id: unknown
          pc: number
          leftover: unknown
          build: unknown
          fumen: unknown
          hold: number
          stat_id: string
          kicktable: Database["public"]["Enums"]["kicktable"]
          hold_type: Database["public"]["Enums"]["hold_type"]
          save_id: string
          save: string
          description: string
          auto_populate: boolean
          gen_minimal: boolean
          gen_all_solves: boolean
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
      status: "processing" | "completed" | "failed"
    }
    CompositeTypes: {
      setup_variants_data: {
        variant_number: number | null
        build: unknown | null
        fumen: unknown | null
        solve_pattern: string | null
      }
      unsafe_fraction: {
        numerator: number | null
        denominator: number | null
      }
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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
      status: ["processing", "completed", "failed"],
    },
  },
} as const
