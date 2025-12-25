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
          due_day: number | null
          id: string
          is_active: boolean
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
          due_day?: number | null
          id?: string
          is_active?: boolean
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
          due_day?: number | null
          id?: string
          is_active?: boolean
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
            foreignKeyName: "shared_transaction_mirrors_mirror_transaction_id_fkey"
            columns: ["mirror_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_shared_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_transaction_mirrors_original_transaction_id_fkey"
            columns: ["original_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_transaction_mirrors_original_transaction_id_fkey"
            columns: ["original_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_shared_expenses"
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
            foreignKeyName: "transaction_splits_settled_transaction_id_fkey"
            columns: ["settled_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_shared_expenses"
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
            foreignKeyName: "transaction_splits_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "v_shared_expenses"
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
          domain: Database["public"]["Enums"]["transaction_domain"]
          external_id: string | null
          id: string
          is_installment: boolean
          is_recurring: boolean
          is_settled: boolean
          is_shared: boolean
          notes: string | null
          payer_id: string | null
          recurrence_pattern: string | null
          related_member_id: string | null
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
          domain?: Database["public"]["Enums"]["transaction_domain"]
          external_id?: string | null
          id?: string
          is_installment?: boolean
          is_recurring?: boolean
          is_settled?: boolean
          is_shared?: boolean
          notes?: string | null
          payer_id?: string | null
          recurrence_pattern?: string | null
          related_member_id?: string | null
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
          domain?: Database["public"]["Enums"]["transaction_domain"]
          external_id?: string | null
          id?: string
          is_installment?: boolean
          is_recurring?: boolean
          is_settled?: boolean
          is_shared?: boolean
          notes?: string | null
          payer_id?: string | null
          recurrence_pattern?: string | null
          related_member_id?: string | null
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
            foreignKeyName: "transactions_source_transaction_id_fkey"
            columns: ["source_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_shared_expenses"
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
          id: string
          name: string
          notes: string | null
          owner_id: string
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
          id?: string
          name: string
          notes?: string | null
          owner_id: string
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
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
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
        ]
      }
    }
    Views: {
      v_shared_expenses: {
        Row: {
          amount: number | null
          category_id: string | null
          created_at: string | null
          creditor_user_id: string | null
          current_installment: number | null
          date: string | null
          description: string | null
          id: string | null
          is_installment: boolean | null
          is_settled: boolean | null
          is_shared: boolean | null
          original_creator_id: string | null
          series_id: string | null
          source_transaction_id: string | null
          total_installments: number | null
          transaction_origin: string | null
          trip_id: string | null
          type: Database["public"]["Enums"]["transaction_type"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          category_id?: string | null
          created_at?: string | null
          creditor_user_id?: never
          current_installment?: number | null
          date?: string | null
          description?: string | null
          id?: string | null
          is_installment?: boolean | null
          is_settled?: boolean | null
          is_shared?: boolean | null
          original_creator_id?: never
          series_id?: string | null
          source_transaction_id?: string | null
          total_installments?: number | null
          transaction_origin?: never
          trip_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          category_id?: string | null
          created_at?: string | null
          creditor_user_id?: never
          current_installment?: number | null
          date?: string | null
          description?: string | null
          id?: string | null
          is_installment?: boolean | null
          is_settled?: boolean | null
          is_shared?: boolean | null
          original_creator_id?: never
          series_id?: string | null
          source_transaction_id?: string | null
          total_installments?: number | null
          transaction_origin?: never
          trip_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
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
            foreignKeyName: "transactions_source_transaction_id_fkey"
            columns: ["source_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_shared_expenses"
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
    }
    Functions: {
      calculate_balance_with_member: {
        Args: { p_member_id: string; p_user_id: string }
        Returns: {
          credits: number
          debits: number
          net: number
          pending_items: number
        }[]
      }
      calculate_dynamic_balance: {
        Args: { p_other_user_id: string; p_user_id: string }
        Returns: number
      }
      get_user_family_id: { Args: { _user_id: string }; Returns: string }
      has_family_link: {
        Args: { p_other_user_id: string; p_user_id: string }
        Returns: boolean
      }
      is_family_member: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      is_trip_participant: {
        Args: { _trip_id: string; _user_id: string }
        Returns: boolean
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
