export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          balance: number
          bank_color: string | null
          bank_id: string | null
          bank_logo: string | null
          closing_day: number | null
          created_at: string
          credit_limit: number | null
          currency: string
          deleted: boolean | null
          due_day: number | null
          id: string
          initial_balance: number | null
          is_active: boolean
          is_international: boolean | null
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          bank_color?: string | null
          bank_id?: string | null
          bank_logo?: string | null
          closing_day?: number | null
          created_at?: string
          credit_limit?: number | null
          currency?: string
          deleted?: boolean | null
          due_day?: number | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean
          is_international?: boolean | null
          name: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          bank_color?: string | null
          bank_id?: string | null
          bank_logo?: string | null
          closing_day?: number | null
          created_at?: string
          credit_limit?: number | null
          currency?: string
          deleted?: boolean | null
          due_day?: number | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean
          is_international?: boolean | null
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          type: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          type?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "families_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          family_id: string
          id: string
          invited_by: string | null
          linked_user_id: string | null
          name: string
          role: Database["public"]["Enums"]["family_role"]
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          family_id: string
          id?: string
          invited_by?: string | null
          linked_user_id?: string | null
          name: string
          role?: Database["public"]["Enums"]["family_role"]
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          family_id?: string
          id?: string
          invited_by?: string | null
          linked_user_id?: string | null
          name?: string
          role?: Database["public"]["Enums"]["family_role"]
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      shared_transaction_mirrors: {
        Row: {
          created_at: string | null
          id: string
          last_sync_at: string | null
          mirror_transaction_id: string
          mirror_user_id: string
          original_transaction_id: string
          sync_error: string | null
          sync_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          mirror_transaction_id: string
          mirror_user_id: string
          original_transaction_id: string
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          mirror_transaction_id?: string
          mirror_user_id?: string
          original_transaction_id?: string
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_transaction_mirrors_mirror_transaction_id_fkey"
            columns: ["mirror_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_transaction_mirrors_original_transaction_id_fkey"
            columns: ["original_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_splits: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_settled: boolean
          member_id: string | null
          name: string
          percentage: number
          settled_at: string | null
          settled_transaction_id: string | null
          transaction_id: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          is_settled?: boolean
          member_id?: string | null
          name: string
          percentage: number
          settled_at?: string | null
          settled_transaction_id?: string | null
          transaction_id: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_settled?: boolean
          member_id?: string | null
          name?: string
          percentage?: number
          settled_at?: string | null
          settled_transaction_id?: string | null
          transaction_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_splits_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_settled_transaction_id_fkey"
            columns: ["settled_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          creator_user_id: string | null
          current_installment: number | null
          date: string
          description: string
          destination_account_id: string | null
          destination_amount: number | null
          destination_currency: string | null
          domain: Database["public"]["Enums"]["transaction_domain"]
          enable_notification: boolean | null
          exchange_rate: number | null
          external_id: string | null
          frequency: string | null
          id: string
          is_installment: boolean
          is_mirror: boolean | null
          is_recurring: boolean
          is_refund: boolean | null
          is_settled: boolean
          is_shared: boolean
          last_generated: string | null
          linked_transaction_id: string | null
          mirror_transaction_id: string | null
          notes: string | null
          notification_date: string | null
          payer_id: string | null
          reconciled: boolean | null
          reconciled_at: string | null
          reconciled_by: string | null
          recurrence_day: number | null
          recurrence_pattern: string | null
          refund_of_transaction_id: string | null
          related_member_id: string | null
          reminder_option: string | null
          series_id: string | null
          settled_at: string | null
          source_transaction_id: string | null
          sync_status: Database["public"]["Enums"]["sync_status"]
          total_installments: number | null
          trip_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          creator_user_id?: string | null
          current_installment?: number | null
          date: string
          description: string
          destination_account_id?: string | null
          destination_amount?: number | null
          destination_currency?: string | null
          domain?: Database["public"]["Enums"]["transaction_domain"]
          enable_notification?: boolean | null
          exchange_rate?: number | null
          external_id?: string | null
          frequency?: string | null
          id?: string
          is_installment?: boolean
          is_mirror?: boolean | null
          is_recurring?: boolean
          is_refund?: boolean | null
          is_settled?: boolean
          is_shared?: boolean
          last_generated?: string | null
          linked_transaction_id?: string | null
          mirror_transaction_id?: string | null
          notes?: string | null
          notification_date?: string | null
          payer_id?: string | null
          reconciled?: boolean | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          recurrence_day?: number | null
          recurrence_pattern?: string | null
          refund_of_transaction_id?: string | null
          related_member_id?: string | null
          reminder_option?: string | null
          series_id?: string | null
          settled_at?: string | null
          source_transaction_id?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"]
          total_installments?: number | null
          trip_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          creator_user_id?: string | null
          current_installment?: number | null
          date?: string
          description?: string
          destination_account_id?: string | null
          destination_amount?: number | null
          destination_currency?: string | null
          domain?: Database["public"]["Enums"]["transaction_domain"]
          enable_notification?: boolean | null
          exchange_rate?: number | null
          external_id?: string | null
          frequency?: string | null
          id?: string
          is_installment?: boolean
          is_mirror?: boolean | null
          is_recurring?: boolean
          is_refund?: boolean | null
          is_settled?: boolean
          is_shared?: boolean
          last_generated?: string | null
          linked_transaction_id?: string | null
          mirror_transaction_id?: string | null
          notes?: string | null
          notification_date?: string | null
          payer_id?: string | null
          reconciled?: boolean | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          recurrence_day?: number | null
          recurrence_pattern?: string | null
          refund_of_transaction_id?: string | null
          related_member_id?: string | null
          reminder_option?: string | null
          series_id?: string | null
          settled_at?: string | null
          source_transaction_id?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"]
          total_installments?: number | null
          trip_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_creator_user_id_fkey"
            columns: ["creator_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_destination_account_id_fkey"
            columns: ["destination_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_refund_of_transaction_id_fkey"
            columns: ["refund_of_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_related_member_id_fkey"
            columns: ["related_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_source_transaction_id_fkey"
            columns: ["source_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_checklist: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          id: string
          is_completed: boolean
          item: string
          order_index: number
          trip_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          item: string
          order_index?: number
          trip_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          item?: string
          order_index?: number
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_checklist_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "trip_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_checklist_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_itinerary: {
        Row: {
          created_at: string
          date: string
          description: string | null
          end_time: string | null
          id: string
          location: string | null
          order_index: number
          start_time: string | null
          title: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          order_index?: number
          start_time?: string | null
          title: string
          trip_id: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          order_index?: number
          start_time?: string | null
          title?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_itinerary_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_participants: {
        Row: {
          created_at: string
          id: string
          member_id: string | null
          name: string
          personal_budget: number | null
          trip_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          member_id?: string | null
          name: string
          personal_budget?: number | null
          trip_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string | null
          name?: string
          personal_budget?: number | null
          trip_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_participants_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_participants_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          budget: number | null
          cover_image: string | null
          created_at: string
          currency: string
          destination: string | null
          end_date: string
          exchange_entries: Json | null
          id: string
          name: string
          notes: string | null
          owner_id: string
          shopping_list: Json | null
          source_trip_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["trip_status"]
          updated_at: string
        }
        Insert: {
          budget?: number | null
          cover_image?: string | null
          created_at?: string
          currency?: string
          destination?: string | null
          end_date: string
          exchange_entries?: Json | null
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          shopping_list?: Json | null
          source_trip_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["trip_status"]
          updated_at?: string
        }
        Update: {
          budget?: number | null
          cover_image?: string | null
          created_at?: string
          currency?: string
          destination?: string | null
          end_date?: string
          exchange_entries?: Json | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          shopping_list?: Json | null
          source_trip_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["trip_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_source_trip_id_fkey"
            columns: ["source_trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_family_id: { Args: { _user_id: string }; Returns: string }
      is_family_member: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      is_trip_participant: {
        Args: { _trip_id: string; _user_id: string }
        Returns: boolean
      }
      resync_all_shared_transactions: {
        Args: never
        Returns: {
          mirrors_created: number
          tx_description: string
          tx_id: string
        }[]
      }
      sync_shared_transaction: {
        Args: { p_transaction_id: string }
        Returns: undefined
      }
    }
    Enums: {
      account_type:
        | "CHECKING"
        | "SAVINGS"
        | "CREDIT_CARD"
        | "INVESTMENT"
        | "CASH"
      family_role: "admin" | "editor" | "viewer"
      split_method: "EQUAL" | "PERCENTAGE" | "CUSTOM"
      sync_status: "SYNCED" | "PENDING" | "ERROR"
      transaction_domain: "PERSONAL" | "SHARED" | "TRAVEL"
      transaction_type: "EXPENSE" | "INCOME" | "TRANSFER"
      trip_status: "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED"
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
      account_type: [
        "CHECKING",
        "SAVINGS",
        "CREDIT_CARD",
        "INVESTMENT",
        "CASH",
      ],
      family_role: ["admin", "editor", "viewer"],
      split_method: ["EQUAL", "PERCENTAGE", "CUSTOM"],
      sync_status: ["SYNCED", "PENDING", "ERROR"],
      transaction_domain: ["PERSONAL", "SHARED", "TRAVEL"],
      transaction_type: ["EXPENSE", "INCOME", "TRANSFER"],
      trip_status: ["PLANNING", "ACTIVE", "COMPLETED", "CANCELLED"],
    },
  },
} as const



// Tipos adicionais para Orçamentos
export interface Budget {
  id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  amount: number;
  currency: string;
  period: 'MONTHLY' | 'YEARLY' | 'WEEKLY';
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  deleted: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  category?: { name: string; icon: string | null };
}

export interface BudgetProgress {
  budget_id: string;
  budget_name: string;
  budget_amount: number;
  spent_amount: number;
  remaining_amount: number;
  percentage_used: number;
  category_name: string | null;
  currency: string;
}

// Tipos adicionais para Metas
export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  target_date: string | null;
  is_completed: boolean;
  deleted: boolean;
  created_at: string;
  updated_at: string;
}
