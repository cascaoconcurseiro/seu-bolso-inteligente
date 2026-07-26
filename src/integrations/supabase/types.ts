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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_reconciliations: {
        Row: {
          account_id: string
          calculated_balance: number
          created_at: string
          difference: number | null
          id: string
          notes: string | null
          reconciled_at: string | null
          statement_balance: number
          statement_date: string
          status: string
          user_id: string
        }
        Insert: {
          account_id: string
          calculated_balance: number
          created_at?: string
          difference?: number | null
          id?: string
          notes?: string | null
          reconciled_at?: string | null
          statement_balance: number
          statement_date: string
          status?: string
          user_id: string
        }
        Update: {
          account_id?: string
          calculated_balance?: number
          created_at?: string
          difference?: number | null
          id?: string
          notes?: string | null
          reconciled_at?: string | null
          statement_balance?: number
          statement_date?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_reconciliations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          balance: number
          bank_color: string | null
          bank_id: string | null
          bank_logo: string | null
          closing_day: number | null
          closing_day_mode: string | null
          created_at: string
          credit_limit: number | null
          currency: string
          deleted_at: string | null
          deleted_by: string | null
          due_day: number | null
          hide_balance: boolean | null
          id: string
          initial_balance: number | null
          is_active: boolean
          is_archived: boolean | null
          is_international: boolean | null
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
          user_id: string
          yield_rate: number | null
          yield_type: string | null
        }
        Insert: {
          balance?: number
          bank_color?: string | null
          bank_id?: string | null
          bank_logo?: string | null
          closing_day?: number | null
          closing_day_mode?: string | null
          created_at?: string
          credit_limit?: number | null
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          due_day?: number | null
          hide_balance?: boolean | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean
          is_archived?: boolean | null
          is_international?: boolean | null
          name: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id: string
          yield_rate?: number | null
          yield_type?: string | null
        }
        Update: {
          balance?: number
          bank_color?: string | null
          bank_id?: string | null
          bank_logo?: string | null
          closing_day?: number | null
          closing_day_mode?: string | null
          created_at?: string
          credit_limit?: number | null
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          due_day?: number | null
          hide_balance?: boolean | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean
          is_archived?: boolean | null
          is_international?: boolean | null
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id?: string
          yield_rate?: number | null
          yield_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_users: {
        Row: {
          granted_at: string
          granted_by: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      asset_transactions: {
        Row: {
          account_id: string | null
          asset_id: string
          created_at: string | null
          date: string
          id: string
          price: number
          quantity: number
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          asset_id: string
          created_at?: string | null
          date?: string
          id?: string
          price: number
          quantity: number
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          asset_id?: string
          created_at?: string | null
          date?: string
          id?: string
          price?: number
          quantity?: number
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          account_id: string | null
          broker_id: string | null
          broker_name: string | null
          created_at: string
          currency: string | null
          current_price: number | null
          deleted: boolean
          id: string
          location: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          purchase_price: number | null
          quantity: number | null
          sector: string | null
          ticker: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          broker_id?: string | null
          broker_name?: string | null
          created_at?: string
          currency?: string | null
          current_price?: number | null
          deleted?: boolean
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number | null
          sector?: string | null
          ticker?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          broker_id?: string | null
          broker_name?: string | null
          created_at?: string
          currency?: string | null
          current_price?: number | null
          deleted?: boolean
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number | null
          sector?: string | null
          ticker?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          changed_fields: string[] | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string
          request_id: string | null
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[] | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          request_id?: string | null
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[] | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          request_id?: string | null
          table_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      b3_tickers_cache: {
        Row: {
          logo_url: string | null
          name: string
          sector: string | null
          ticker: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          logo_url?: string | null
          name: string
          sector?: string | null
          ticker: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          logo_url?: string | null
          name?: string
          sector?: string | null
          ticker?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      balance_changes: {
        Row: {
          account_id: string
          changed_at: string
          delta: number | null
          id: string
          new_balance: number
          old_balance: number
          transaction_id: string | null
          triggered_by: string | null
        }
        Insert: {
          account_id: string
          changed_at?: string
          delta?: number | null
          id?: string
          new_balance: number
          old_balance: number
          transaction_id?: string | null
          triggered_by?: string | null
        }
        Update: {
          account_id?: string
          changed_at?: string
          delta?: number | null
          id?: string
          new_balance?: number
          old_balance?: number
          transaction_id?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "balance_changes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          creator_user_id: string | null
          currency: string
          deleted: boolean | null
          deleted_at: string | null
          deleted_by: string | null
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          period: string
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          creator_user_id?: string | null
          currency?: string
          deleted?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          period?: string
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          creator_user_id?: string | null
          currency?: string
          deleted?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          period?: string
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          icon: string | null
          id: string
          is_archived: boolean | null
          name: string
          parent_category_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          name: string
          parent_category_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          name?: string
          parent_category_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      category_keywords: {
        Row: {
          category_id: string | null
          created_at: string | null
          id: string
          keyword: string
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          keyword: string
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          keyword?: string
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "category_keywords_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_closing_overrides: {
        Row: {
          account_id: string
          closing_date: string
          created_at: string | null
          due_date: string | null
          id: string
          reference_date: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          closing_date: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          reference_date: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          closing_date?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          reference_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_closing_overrides_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_invoices: {
        Row: {
          account_id: string
          closing_date: string
          created_at: string | null
          due_date: string
          id: string
          month: number
          status: string
          total_amount: number
          updated_at: string | null
          year: number
        }
        Insert: {
          account_id: string
          closing_date: string
          created_at?: string | null
          due_date: string
          id?: string
          month: number
          status?: string
          total_amount?: number
          updated_at?: string | null
          year: number
        }
        Update: {
          account_id?: string
          closing_date?: string
          created_at?: string | null
          due_date?: string
          id?: string
          month?: number
          status?: string
          total_amount?: number
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_invoices_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          app_version: string | null
          col: number | null
          created_at: string
          error_type: string
          extra: Json | null
          file: string | null
          id: string
          line: number | null
          message: string
          stack: string | null
          status: string
          updated_at: string
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          col?: number | null
          created_at?: string
          error_type?: string
          extra?: Json | null
          file?: string | null
          id?: string
          line?: number | null
          message: string
          stack?: string | null
          status?: string
          updated_at?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          col?: number | null
          created_at?: string
          error_type?: string
          extra?: Json | null
          file?: string | null
          id?: string
          line?: number | null
          message?: string
          stack?: string | null
          status?: string
          updated_at?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      families: {
        Row: {
          created_at: string
          deleted: boolean
          deleted_at: string | null
          deleted_by: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "families_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "families_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "families_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "families_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      family_invitations: {
        Row: {
          created_at: string
          deleted: boolean
          deleted_at: string | null
          family_id: string
          from_user_id: string
          id: string
          member_name: string
          role: Database["public"]["Enums"]["family_role"]
          scope_end_date: string | null
          scope_start_date: string | null
          scope_trip_id: string | null
          sharing_scope: string | null
          status: string
          to_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted?: boolean
          deleted_at?: string | null
          family_id: string
          from_user_id: string
          id?: string
          member_name: string
          role?: Database["public"]["Enums"]["family_role"]
          scope_end_date?: string | null
          scope_start_date?: string | null
          scope_trip_id?: string | null
          sharing_scope?: string | null
          status?: string
          to_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted?: boolean
          deleted_at?: string | null
          family_id?: string
          from_user_id?: string
          id?: string
          member_name?: string
          role?: Database["public"]["Enums"]["family_role"]
          scope_end_date?: string | null
          scope_start_date?: string | null
          scope_trip_id?: string | null
          sharing_scope?: string | null
          status?: string
          to_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_invitations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "active_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_invitations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_invitations_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_invitations_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "family_invitations_scope_trip_id_fkey"
            columns: ["scope_trip_id"]
            isOneToOne: false
            referencedRelation: "active_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_invitations_scope_trip_id_fkey"
            columns: ["scope_trip_id"]
            isOneToOne: false
            referencedRelation: "trip_budget_summary"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "family_invitations_scope_trip_id_fkey"
            columns: ["scope_trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_invitations_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_invitations_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      family_members: {
        Row: {
          active_in_form: boolean
          avatar_color: string | null
          avatar_icon: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          family_id: string
          id: string
          invited_by: string | null
          linked_user_id: string | null
          member_type: string
          name: string
          removal_reason: string | null
          removed_at: string | null
          removed_by: string | null
          role: Database["public"]["Enums"]["family_role"]
          scope_end_date: string | null
          scope_start_date: string | null
          scope_trip_id: string | null
          sharing_scope: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active_in_form?: boolean
          avatar_color?: string | null
          avatar_icon?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          family_id: string
          id?: string
          invited_by?: string | null
          linked_user_id?: string | null
          member_type?: string
          name: string
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          role?: Database["public"]["Enums"]["family_role"]
          scope_end_date?: string | null
          scope_start_date?: string | null
          scope_trip_id?: string | null
          sharing_scope?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active_in_form?: boolean
          avatar_color?: string | null
          avatar_icon?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          family_id?: string
          id?: string
          invited_by?: string | null
          linked_user_id?: string | null
          member_type?: string
          name?: string
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          role?: Database["public"]["Enums"]["family_role"]
          scope_end_date?: string | null
          scope_start_date?: string | null
          scope_trip_id?: string | null
          sharing_scope?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "active_families"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "family_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "family_members_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "family_members_scope_trip_id_fkey"
            columns: ["scope_trip_id"]
            isOneToOne: false
            referencedRelation: "active_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_scope_trip_id_fkey"
            columns: ["scope_trip_id"]
            isOneToOne: false
            referencedRelation: "trip_budget_summary"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "family_members_scope_trip_id_fkey"
            columns: ["scope_trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      goal_milestones: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          name: string
          reached_at: string | null
          target_pct: number
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          name: string
          reached_at?: string | null
          target_pct: number
          user_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          name?: string
          reached_at?: string | null
          target_pct?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string
          creator_user_id: string | null
          current_amount: number | null
          deleted: boolean
          description: string | null
          id: string
          linked_account_id: string | null
          name: string
          priority: string | null
          status: string | null
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          creator_user_id?: string | null
          current_amount?: number | null
          deleted?: boolean
          description?: string | null
          id?: string
          linked_account_id?: string | null
          name: string
          priority?: string | null
          status?: string | null
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          creator_user_id?: string | null
          current_amount?: number | null
          deleted?: boolean
          description?: string | null
          id?: string
          linked_account_id?: string | null
          name?: string
          priority?: string | null
          status?: string | null
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_linked_account_id_fkey"
            columns: ["linked_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          budget_warning_enabled: boolean | null
          budget_warning_threshold: number | null
          created_at: string | null
          credit_limit_warning_enabled: boolean | null
          credit_limit_warning_threshold: number | null
          email_notifications: boolean | null
          id: string
          invoice_due_days_before: number | null
          invoice_due_enabled: boolean | null
          low_balance_enabled: boolean | null
          low_balance_threshold: number | null
          preferred_hour: number
          push_bills_enabled: boolean
          push_days_before: number
          push_goals_enabled: boolean
          push_notifications: boolean | null
          push_weekly_enabled: boolean
          recurring_enabled: boolean | null
          savings_goal_enabled: boolean | null
          shared_pending_enabled: boolean | null
          updated_at: string | null
          user_id: string
          weekly_summary_enabled: boolean | null
        }
        Insert: {
          budget_warning_enabled?: boolean | null
          budget_warning_threshold?: number | null
          created_at?: string | null
          credit_limit_warning_enabled?: boolean | null
          credit_limit_warning_threshold?: number | null
          email_notifications?: boolean | null
          id?: string
          invoice_due_days_before?: number | null
          invoice_due_enabled?: boolean | null
          low_balance_enabled?: boolean | null
          low_balance_threshold?: number | null
          preferred_hour?: number
          push_bills_enabled?: boolean
          push_days_before?: number
          push_goals_enabled?: boolean
          push_notifications?: boolean | null
          push_weekly_enabled?: boolean
          recurring_enabled?: boolean | null
          savings_goal_enabled?: boolean | null
          shared_pending_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          weekly_summary_enabled?: boolean | null
        }
        Update: {
          budget_warning_enabled?: boolean | null
          budget_warning_threshold?: number | null
          created_at?: string | null
          credit_limit_warning_enabled?: boolean | null
          credit_limit_warning_threshold?: number | null
          email_notifications?: boolean | null
          id?: string
          invoice_due_days_before?: number | null
          invoice_due_enabled?: boolean | null
          low_balance_enabled?: boolean | null
          low_balance_threshold?: number | null
          preferred_hour?: number
          push_bills_enabled?: boolean
          push_days_before?: number
          push_goals_enabled?: boolean
          push_notifications?: boolean | null
          push_weekly_enabled?: boolean
          recurring_enabled?: boolean | null
          savings_goal_enabled?: boolean | null
          shared_pending_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          weekly_summary_enabled?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string | null
          dismissed_at: string | null
          expires_at: string | null
          icon: string | null
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          message: string
          metadata: Json | null
          priority: string | null
          read_at: string | null
          related_id: string | null
          related_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string | null
          dismissed_at?: string | null
          expires_at?: string | null
          icon?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          priority?: string | null
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string | null
          dismissed_at?: string | null
          expires_at?: string | null
          icon?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          priority?: string | null
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pin_attempts: {
        Row: {
          attempt_count: number
          last_attempt_at: string | null
          locked_until: string | null
          user_id: string
        }
        Insert: {
          attempt_count?: number
          last_attempt_at?: string | null
          locked_until?: string | null
          user_id: string
        }
        Update: {
          attempt_count?: number
          last_attempt_at?: string | null
          locked_until?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          app_pin_hash: string | null
          avatar_color: string | null
          avatar_icon: string | null
          avatar_url: string | null
          base_currency: string | null
          created_at: string
          default_account_id: string | null
          default_credit_card_id: string | null
          email: string
          full_name: string | null
          global_cdi_rate: number | null
          id: string
          low_balance_threshold: number | null
          month_start_day: number | null
          monthly_budget: number | null
          monthly_report_enabled: boolean
          require_pin_on_open: boolean | null
          shared_closing_day: number | null
          shared_credit_card_behavior: string | null
          shared_due_day: number | null
          shared_expenses_behavior: string | null
          shared_sync_credit_card_id: string | null
          updated_at: string
          use_subcategories: boolean | null
        }
        Insert: {
          app_pin_hash?: string | null
          avatar_color?: string | null
          avatar_icon?: string | null
          avatar_url?: string | null
          base_currency?: string | null
          created_at?: string
          default_account_id?: string | null
          default_credit_card_id?: string | null
          email: string
          full_name?: string | null
          global_cdi_rate?: number | null
          id: string
          low_balance_threshold?: number | null
          month_start_day?: number | null
          monthly_budget?: number | null
          monthly_report_enabled?: boolean
          require_pin_on_open?: boolean | null
          shared_closing_day?: number | null
          shared_credit_card_behavior?: string | null
          shared_due_day?: number | null
          shared_expenses_behavior?: string | null
          shared_sync_credit_card_id?: string | null
          updated_at?: string
          use_subcategories?: boolean | null
        }
        Update: {
          app_pin_hash?: string | null
          avatar_color?: string | null
          avatar_icon?: string | null
          avatar_url?: string | null
          base_currency?: string | null
          created_at?: string
          default_account_id?: string | null
          default_credit_card_id?: string | null
          email?: string
          full_name?: string | null
          global_cdi_rate?: number | null
          id?: string
          low_balance_threshold?: number | null
          month_start_day?: number | null
          monthly_budget?: number | null
          monthly_report_enabled?: boolean
          require_pin_on_open?: boolean | null
          shared_closing_day?: number | null
          shared_credit_card_behavior?: string | null
          shared_due_day?: number | null
          shared_expenses_behavior?: string | null
          shared_sync_credit_card_id?: string | null
          updated_at?: string
          use_subcategories?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_account_id_fkey"
            columns: ["default_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_default_credit_card_id_fkey"
            columns: ["default_credit_card_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_shared_sync_credit_card_id_fkey"
            columns: ["shared_sync_credit_card_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      settlement_reversals: {
        Row: {
          amount: number
          created_at: string
          id: string
          original_transaction_id: string
          payment_transaction_id: string
          reversal_reason: string
          reversed_at: string
          reversed_by: string
          split_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          original_transaction_id: string
          payment_transaction_id: string
          reversal_reason: string
          reversed_at: string
          reversed_by: string
          split_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          original_transaction_id?: string
          payment_transaction_id?: string
          reversal_reason?: string
          reversed_at?: string
          reversed_by?: string
          split_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_reversals_original_transaction_id_fkey"
            columns: ["original_transaction_id"]
            isOneToOne: false
            referencedRelation: "shared_transactions_view"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "settlement_reversals_original_transaction_id_fkey"
            columns: ["original_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_reversals_original_transaction_id_fkey"
            columns: ["original_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_ssot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_reversals_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "shared_transactions_view"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "settlement_reversals_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_reversals_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_ssot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_reversals_split_id_fkey"
            columns: ["split_id"]
            isOneToOne: false
            referencedRelation: "transaction_splits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_reversals_split_id_fkey"
            columns: ["split_id"]
            isOneToOne: false
            referencedRelation: "transaction_splits_with_settlement"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_credit_cards: {
        Row: {
          account_id: string
          created_at: string | null
          credit_limit: number | null
          id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          credit_limit?: number | null
          id?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          credit_limit?: number | null
          id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_credit_cards_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_credit_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_credit_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      transaction_auto_share_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          member_id: string
          name: string
          split_ratio: number
          trigger_type: string
          trigger_value: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          member_id: string
          name: string
          split_ratio?: number
          trigger_type: string
          trigger_value: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          member_id?: string
          name?: string
          split_ratio?: number
          trigger_type?: string
          trigger_value?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_auto_share_rules_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "active_family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_auto_share_rules_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_splits: {
        Row: {
          amount: number
          created_at: string
          creditor_settlement_tx_id: string | null
          debtor_settlement_expires_at: string | null
          debtor_settlement_tx_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_settled: boolean
          member_id: string | null
          name: string
          percentage: number
          settled_at: string | null
          settled_by_creditor: boolean | null
          settled_by_debtor: boolean | null
          settled_transaction_id: string | null
          transaction_id: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          creditor_settlement_tx_id?: string | null
          debtor_settlement_expires_at?: string | null
          debtor_settlement_tx_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_settled?: boolean
          member_id?: string | null
          name: string
          percentage: number
          settled_at?: string | null
          settled_by_creditor?: boolean | null
          settled_by_debtor?: boolean | null
          settled_transaction_id?: string | null
          transaction_id: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          creditor_settlement_tx_id?: string | null
          debtor_settlement_expires_at?: string | null
          debtor_settlement_tx_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_settled?: boolean
          member_id?: string | null
          name?: string
          percentage?: number
          settled_at?: string | null
          settled_by_creditor?: boolean | null
          settled_by_debtor?: boolean | null
          settled_transaction_id?: string | null
          transaction_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_splits_creditor_settlement_tx_id_fkey"
            columns: ["creditor_settlement_tx_id"]
            isOneToOne: false
            referencedRelation: "shared_transactions_view"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "transaction_splits_creditor_settlement_tx_id_fkey"
            columns: ["creditor_settlement_tx_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_creditor_settlement_tx_id_fkey"
            columns: ["creditor_settlement_tx_id"]
            isOneToOne: false
            referencedRelation: "transactions_ssot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_debtor_settlement_tx_id_fkey"
            columns: ["debtor_settlement_tx_id"]
            isOneToOne: false
            referencedRelation: "shared_transactions_view"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "transaction_splits_debtor_settlement_tx_id_fkey"
            columns: ["debtor_settlement_tx_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_debtor_settlement_tx_id_fkey"
            columns: ["debtor_settlement_tx_id"]
            isOneToOne: false
            referencedRelation: "transactions_ssot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "active_family_members"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "shared_transactions_view"
            referencedColumns: ["transaction_id"]
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
            referencedRelation: "transactions_ssot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "shared_transactions_view"
            referencedColumns: ["transaction_id"]
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
            referencedRelation: "transactions_ssot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          advanced_at: string | null
          amount: number
          asset_id: string | null
          category_id: string | null
          competence_date: string
          created_at: string
          creator_user_id: string | null
          currency: string | null
          current_installment: number | null
          date: string
          deleted_at: string | null
          deleted_by: string | null
          description: string
          destination_account_id: string | null
          destination_amount: number | null
          destination_currency: string | null
          domain: Database["public"]["Enums"]["transaction_domain"]
          enable_notification: boolean | null
          exchange_rate: number | null
          external_id: string | null
          frequency: string | null
          goal_id: string | null
          id: string
          idempotency_key: string | null
          import_hash: string | null
          is_installment: boolean
          is_recurring: boolean
          is_refund: boolean | null
          is_settled: boolean
          is_shared: boolean
          last_generated: string | null
          last_generated_date: string | null
          notes: string | null
          notification_date: string | null
          payer_id: string | null
          recurrence_day: number | null
          recurrence_pattern: string | null
          refund_of_transaction_id: string | null
          related_member_id: string | null
          reminder_option: string | null
          series_id: string | null
          settled_at: string | null
          source_transaction_id: string | null
          status: string
          sync_status: Database["public"]["Enums"]["sync_status"]
          total_installments: number | null
          trip_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          advanced_at?: string | null
          amount: number
          asset_id?: string | null
          category_id?: string | null
          competence_date: string
          created_at?: string
          creator_user_id?: string | null
          currency?: string | null
          current_installment?: number | null
          date: string
          deleted_at?: string | null
          deleted_by?: string | null
          description: string
          destination_account_id?: string | null
          destination_amount?: number | null
          destination_currency?: string | null
          domain?: Database["public"]["Enums"]["transaction_domain"]
          enable_notification?: boolean | null
          exchange_rate?: number | null
          external_id?: string | null
          frequency?: string | null
          goal_id?: string | null
          id?: string
          idempotency_key?: string | null
          import_hash?: string | null
          is_installment?: boolean
          is_recurring?: boolean
          is_refund?: boolean | null
          is_settled?: boolean
          is_shared?: boolean
          last_generated?: string | null
          last_generated_date?: string | null
          notes?: string | null
          notification_date?: string | null
          payer_id?: string | null
          recurrence_day?: number | null
          recurrence_pattern?: string | null
          refund_of_transaction_id?: string | null
          related_member_id?: string | null
          reminder_option?: string | null
          series_id?: string | null
          settled_at?: string | null
          source_transaction_id?: string | null
          status?: string
          sync_status?: Database["public"]["Enums"]["sync_status"]
          total_installments?: number | null
          trip_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          advanced_at?: string | null
          amount?: number
          asset_id?: string | null
          category_id?: string | null
          competence_date?: string
          created_at?: string
          creator_user_id?: string | null
          currency?: string | null
          current_installment?: number | null
          date?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          destination_account_id?: string | null
          destination_amount?: number | null
          destination_currency?: string | null
          domain?: Database["public"]["Enums"]["transaction_domain"]
          enable_notification?: boolean | null
          exchange_rate?: number | null
          external_id?: string | null
          frequency?: string | null
          goal_id?: string | null
          id?: string
          idempotency_key?: string | null
          import_hash?: string | null
          is_installment?: boolean
          is_recurring?: boolean
          is_refund?: boolean | null
          is_settled?: boolean
          is_shared?: boolean
          last_generated?: string | null
          last_generated_date?: string | null
          notes?: string | null
          notification_date?: string | null
          payer_id?: string | null
          recurrence_day?: number | null
          recurrence_pattern?: string | null
          refund_of_transaction_id?: string | null
          related_member_id?: string | null
          reminder_option?: string | null
          series_id?: string | null
          settled_at?: string | null
          source_transaction_id?: string | null
          status?: string
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
            foreignKeyName: "transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
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
            foreignKeyName: "transactions_creator_user_id_fkey"
            columns: ["creator_user_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transactions_destination_account_id_fkey"
            columns: ["destination_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "active_family_members"
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
            foreignKeyName: "transactions_refund_of_transaction_id_fkey"
            columns: ["refund_of_transaction_id"]
            isOneToOne: false
            referencedRelation: "shared_transactions_view"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "transactions_refund_of_transaction_id_fkey"
            columns: ["refund_of_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_refund_of_transaction_id_fkey"
            columns: ["refund_of_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_ssot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_related_member_id_fkey"
            columns: ["related_member_id"]
            isOneToOne: false
            referencedRelation: "active_family_members"
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
            referencedRelation: "shared_transactions_view"
            referencedColumns: ["transaction_id"]
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
            referencedRelation: "transactions_ssot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "active_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_budget_summary"
            referencedColumns: ["trip_id"]
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
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
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
            referencedRelation: "active_trip_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_checklist_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "trip_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_checklist_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "active_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_checklist_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_budget_summary"
            referencedColumns: ["trip_id"]
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
      trip_exchange_purchases: {
        Row: {
          cet_percentage: number | null
          created_at: string | null
          description: string | null
          effective_rate: number
          exchange_rate: number
          foreign_amount: number
          id: string
          local_amount: number
          purchase_date: string
          trip_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cet_percentage?: number | null
          created_at?: string | null
          description?: string | null
          effective_rate: number
          exchange_rate: number
          foreign_amount: number
          id?: string
          local_amount: number
          purchase_date?: string
          trip_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cet_percentage?: number | null
          created_at?: string | null
          description?: string | null
          effective_rate?: number
          exchange_rate?: number
          foreign_amount?: number
          id?: string
          local_amount?: number
          purchase_date?: string
          trip_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_exchange_purchases_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "active_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_exchange_purchases_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_budget_summary"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "trip_exchange_purchases_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_invitations: {
        Row: {
          created_at: string | null
          deleted: boolean
          deleted_at: string | null
          id: string
          invitee_id: string
          inviter_id: string
          message: string | null
          responded_at: string | null
          status: string
          trip_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean
          deleted_at?: string | null
          id?: string
          invitee_id: string
          inviter_id: string
          message?: string | null
          responded_at?: string | null
          status?: string
          trip_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean
          deleted_at?: string | null
          id?: string
          invitee_id?: string
          inviter_id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
          trip_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trip_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trip_invitations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "active_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_invitations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_budget_summary"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "trip_invitations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_itinerary: {
        Row: {
          category: string | null
          created_at: string
          date: string
          description: string | null
          end_time: string | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          maps_url: string | null
          order_index: number
          start_time: string | null
          title: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          date: string
          description?: string | null
          end_time?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          maps_url?: string | null
          order_index?: number
          start_time?: string | null
          title: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          date?: string
          description?: string | null
          end_time?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          maps_url?: string | null
          order_index?: number
          start_time?: string | null
          title?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_itinerary_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "active_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_itinerary_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_budget_summary"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "trip_itinerary_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_members: {
        Row: {
          can_edit_details: boolean | null
          can_manage_expenses: boolean | null
          created_at: string | null
          guest_name: string | null
          id: string
          personal_budget: number | null
          removal_reason: string | null
          removed_at: string | null
          removed_by: string | null
          role: string
          status: string
          trip_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          can_edit_details?: boolean | null
          can_manage_expenses?: boolean | null
          created_at?: string | null
          guest_name?: string | null
          id?: string
          personal_budget?: number | null
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          role?: string
          status?: string
          trip_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          can_edit_details?: boolean | null
          can_manage_expenses?: boolean | null
          created_at?: string | null
          guest_name?: string | null
          id?: string
          personal_budget?: number | null
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          role?: string
          status?: string
          trip_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_trip_members_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_trip_members_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "active_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_budget_summary"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          archived_at: string | null
          budget: number | null
          cover_image: string | null
          created_at: string
          creator_user_id: string | null
          currency: string
          deleted: boolean
          deleted_at: string | null
          deleted_by: string | null
          destination: string
          end_date: string
          exchange_entries: Json | null
          id: string
          is_archived: boolean | null
          itinerary_order_version: number
          latitude: number | null
          longitude: number | null
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
          archived_at?: string | null
          budget?: number | null
          cover_image?: string | null
          created_at?: string
          creator_user_id?: string | null
          currency?: string
          deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
          destination: string
          end_date: string
          exchange_entries?: Json | null
          id?: string
          is_archived?: boolean | null
          itinerary_order_version?: number
          latitude?: number | null
          longitude?: number | null
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
          archived_at?: string | null
          budget?: number | null
          cover_image?: string | null
          created_at?: string
          creator_user_id?: string | null
          currency?: string
          deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
          destination?: string
          end_date?: string
          exchange_entries?: Json | null
          id?: string
          is_archived?: boolean | null
          itinerary_order_version?: number
          latitude?: number | null
          longitude?: number | null
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
            foreignKeyName: "trips_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trips_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trips_source_trip_id_fkey"
            columns: ["source_trip_id"]
            isOneToOne: false
            referencedRelation: "active_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_source_trip_id_fkey"
            columns: ["source_trip_id"]
            isOneToOne: false
            referencedRelation: "trip_budget_summary"
            referencedColumns: ["trip_id"]
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
      user_category_learning: {
        Row: {
          category_id: string | null
          confidence: number | null
          created_at: string | null
          description_pattern: string
          id: string
          last_used_at: string | null
          times_used: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category_id?: string | null
          confidence?: number | null
          created_at?: string | null
          description_pattern: string
          id?: string
          last_used_at?: string | null
          times_used?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category_id?: string | null
          confidence?: number | null
          created_at?: string | null
          description_pattern?: string
          id?: string
          last_used_at?: string | null
          times_used?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_category_learning_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_families: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          deleted_at: string | null
          deleted_by: string | null
          id: string | null
          name: string | null
          owner_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string | null
          name?: string | null
          owner_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string | null
          name?: string | null
          owner_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "families_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "families_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "families_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "families_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      active_family_members: {
        Row: {
          avatar_color: string | null
          avatar_icon: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          family_id: string | null
          id: string | null
          invited_by: string | null
          linked_user_id: string | null
          member_type: string | null
          name: string | null
          removal_reason: string | null
          removed_at: string | null
          removed_by: string | null
          role: Database["public"]["Enums"]["family_role"] | null
          scope_end_date: string | null
          scope_start_date: string | null
          scope_trip_id: string | null
          sharing_scope: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_color?: string | null
          avatar_icon?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          family_id?: string | null
          id?: string | null
          invited_by?: string | null
          linked_user_id?: string | null
          member_type?: string | null
          name?: string | null
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          role?: Database["public"]["Enums"]["family_role"] | null
          scope_end_date?: string | null
          scope_start_date?: string | null
          scope_trip_id?: string | null
          sharing_scope?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_color?: string | null
          avatar_icon?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          family_id?: string | null
          id?: string | null
          invited_by?: string | null
          linked_user_id?: string | null
          member_type?: string | null
          name?: string | null
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          role?: Database["public"]["Enums"]["family_role"] | null
          scope_end_date?: string | null
          scope_start_date?: string | null
          scope_trip_id?: string | null
          sharing_scope?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "active_families"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "family_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "family_members_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "family_members_scope_trip_id_fkey"
            columns: ["scope_trip_id"]
            isOneToOne: false
            referencedRelation: "active_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_scope_trip_id_fkey"
            columns: ["scope_trip_id"]
            isOneToOne: false
            referencedRelation: "trip_budget_summary"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "family_members_scope_trip_id_fkey"
            columns: ["scope_trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      active_trip_members: {
        Row: {
          can_edit_details: boolean | null
          can_manage_expenses: boolean | null
          created_at: string | null
          id: string | null
          personal_budget: number | null
          removal_reason: string | null
          removed_at: string | null
          removed_by: string | null
          role: string | null
          status: string | null
          trip_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          can_edit_details?: boolean | null
          can_manage_expenses?: boolean | null
          created_at?: string | null
          id?: string | null
          personal_budget?: number | null
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          role?: string | null
          status?: string | null
          trip_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          can_edit_details?: boolean | null
          can_manage_expenses?: boolean | null
          created_at?: string | null
          id?: string | null
          personal_budget?: number | null
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          role?: string | null
          status?: string | null
          trip_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_trip_members_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_trip_members_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "active_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_budget_summary"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      active_trips: {
        Row: {
          budget: number | null
          cover_image: string | null
          created_at: string | null
          currency: string | null
          deleted: boolean | null
          deleted_at: string | null
          deleted_by: string | null
          destination: string | null
          end_date: string | null
          exchange_entries: Json | null
          id: string | null
          name: string | null
          notes: string | null
          owner_id: string | null
          shopping_list: Json | null
          source_trip_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["trip_status"] | null
          updated_at: string | null
        }
        Insert: {
          budget?: number | null
          cover_image?: string | null
          created_at?: string | null
          currency?: string | null
          deleted?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          destination?: string | null
          end_date?: string | null
          exchange_entries?: Json | null
          id?: string | null
          name?: string | null
          notes?: string | null
          owner_id?: string | null
          shopping_list?: Json | null
          source_trip_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["trip_status"] | null
          updated_at?: string | null
        }
        Update: {
          budget?: number | null
          cover_image?: string | null
          created_at?: string | null
          currency?: string | null
          deleted?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          destination?: string | null
          end_date?: string | null
          exchange_entries?: Json | null
          id?: string | null
          name?: string | null
          notes?: string | null
          owner_id?: string | null
          shopping_list?: Json | null
          source_trip_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["trip_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trips_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trips_source_trip_id_fkey"
            columns: ["source_trip_id"]
            isOneToOne: false
            referencedRelation: "active_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_source_trip_id_fkey"
            columns: ["source_trip_id"]
            isOneToOne: false
            referencedRelation: "trip_budget_summary"
            referencedColumns: ["trip_id"]
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
      shared_transactions_for_current_user: {
        Row: {
          account_id: string | null
          category_id: string | null
          created_at: string | null
          date: string | null
          description: string | null
          domain: string | null
          is_mirror: boolean | null
          is_shared: boolean | null
          owner_user_id: string | null
          payer_id: string | null
          root_amount: number | null
          root_owner_user_id: string | null
          share_amount: number | null
          source_transaction_id: string | null
          splits: Json | null
          total_amount: number | null
          transaction_id: string | null
          type: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      shared_transactions_view: {
        Row: {
          account_id: string | null
          category_id: string | null
          created_at: string | null
          date: string | null
          description: string | null
          domain: Database["public"]["Enums"]["transaction_domain"] | null
          is_mirror: boolean | null
          is_shared: boolean | null
          owner_user_id: string | null
          payer_id: string | null
          root_amount: number | null
          root_owner_user_id: string | null
          source_transaction_id: string | null
          splits: Json | null
          total_amount: number | null
          transaction_id: string | null
          type: Database["public"]["Enums"]["transaction_type"] | null
          updated_at: string | null
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
            foreignKeyName: "transactions_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "active_family_members"
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
            foreignKeyName: "transactions_source_transaction_id_fkey"
            columns: ["source_transaction_id"]
            isOneToOne: false
            referencedRelation: "shared_transactions_view"
            referencedColumns: ["transaction_id"]
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
            referencedRelation: "transactions_ssot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      transaction_splits_with_settlement: {
        Row: {
          amount: number | null
          created_at: string | null
          creditor_settlement_tx_id: string | null
          debtor_settlement_tx_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string | null
          is_fully_settled: boolean | null
          is_settled: boolean | null
          member_id: string | null
          name: string | null
          percentage: number | null
          settled_at: string | null
          settled_by_creditor: boolean | null
          settled_by_debtor: boolean | null
          settled_transaction_id: string | null
          settlement_status: string | null
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          creditor_settlement_tx_id?: string | null
          debtor_settlement_tx_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string | null
          is_fully_settled?: never
          is_settled?: boolean | null
          member_id?: string | null
          name?: string | null
          percentage?: number | null
          settled_at?: string | null
          settled_by_creditor?: boolean | null
          settled_by_debtor?: boolean | null
          settled_transaction_id?: string | null
          settlement_status?: never
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          creditor_settlement_tx_id?: string | null
          debtor_settlement_tx_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string | null
          is_fully_settled?: never
          is_settled?: boolean | null
          member_id?: string | null
          name?: string | null
          percentage?: number | null
          settled_at?: string | null
          settled_by_creditor?: boolean | null
          settled_by_debtor?: boolean | null
          settled_transaction_id?: string | null
          settlement_status?: never
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_splits_creditor_settlement_tx_id_fkey"
            columns: ["creditor_settlement_tx_id"]
            isOneToOne: false
            referencedRelation: "shared_transactions_view"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "transaction_splits_creditor_settlement_tx_id_fkey"
            columns: ["creditor_settlement_tx_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_creditor_settlement_tx_id_fkey"
            columns: ["creditor_settlement_tx_id"]
            isOneToOne: false
            referencedRelation: "transactions_ssot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_debtor_settlement_tx_id_fkey"
            columns: ["debtor_settlement_tx_id"]
            isOneToOne: false
            referencedRelation: "shared_transactions_view"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "transaction_splits_debtor_settlement_tx_id_fkey"
            columns: ["debtor_settlement_tx_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_debtor_settlement_tx_id_fkey"
            columns: ["debtor_settlement_tx_id"]
            isOneToOne: false
            referencedRelation: "transactions_ssot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "active_family_members"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "shared_transactions_view"
            referencedColumns: ["transaction_id"]
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
            referencedRelation: "transactions_ssot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "shared_transactions_view"
            referencedColumns: ["transaction_id"]
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
            referencedRelation: "transactions_ssot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      transactions_ssot: {
        Row: {
          account: Json | null
          account_id: string | null
          advanced_at: string | null
          amount: number | null
          category: Json | null
          category_id: string | null
          competence_date: string | null
          created_at: string | null
          creator_user_id: string | null
          currency: string | null
          current_installment: number | null
          date: string | null
          description: string | null
          destination_account_id: string | null
          destination_amount: number | null
          destination_currency: string | null
          domain: Database["public"]["Enums"]["transaction_domain"] | null
          enable_notification: boolean | null
          exchange_rate: number | null
          frequency: string | null
          id: string | null
          import_hash: string | null
          is_installment: boolean | null
          is_recurring: boolean | null
          is_refund: boolean | null
          is_settled: boolean | null
          is_shared: boolean | null
          last_generated: string | null
          last_generated_date: string | null
          notes: string | null
          notification_date: string | null
          payer_id: string | null
          recurrence_day: number | null
          recurrence_pattern: string | null
          refund_of_transaction_id: string | null
          related_member_id: string | null
          reminder_option: string | null
          series_id: string | null
          settled_at: string | null
          source_transaction_id: string | null
          split_user_ids: string[] | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          total_installments: number | null
          transaction_splits: Json | null
          trip_id: string | null
          type: Database["public"]["Enums"]["transaction_type"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account?: never
          account_id?: string | null
          advanced_at?: string | null
          amount?: number | null
          category?: never
          category_id?: string | null
          competence_date?: string | null
          created_at?: string | null
          creator_user_id?: string | null
          currency?: string | null
          current_installment?: number | null
          date?: string | null
          description?: string | null
          destination_account_id?: string | null
          destination_amount?: number | null
          destination_currency?: string | null
          domain?: Database["public"]["Enums"]["transaction_domain"] | null
          enable_notification?: boolean | null
          exchange_rate?: number | null
          frequency?: string | null
          id?: string | null
          import_hash?: string | null
          is_installment?: boolean | null
          is_recurring?: boolean | null
          is_refund?: boolean | null
          is_settled?: boolean | null
          is_shared?: boolean | null
          last_generated?: string | null
          last_generated_date?: string | null
          notes?: string | null
          notification_date?: string | null
          payer_id?: string | null
          recurrence_day?: number | null
          recurrence_pattern?: string | null
          refund_of_transaction_id?: string | null
          related_member_id?: string | null
          reminder_option?: string | null
          series_id?: string | null
          settled_at?: string | null
          source_transaction_id?: string | null
          split_user_ids?: never
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          total_installments?: number | null
          transaction_splits?: never
          trip_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account?: never
          account_id?: string | null
          advanced_at?: string | null
          amount?: number | null
          category?: never
          category_id?: string | null
          competence_date?: string | null
          created_at?: string | null
          creator_user_id?: string | null
          currency?: string | null
          current_installment?: number | null
          date?: string | null
          description?: string | null
          destination_account_id?: string | null
          destination_amount?: number | null
          destination_currency?: string | null
          domain?: Database["public"]["Enums"]["transaction_domain"] | null
          enable_notification?: boolean | null
          exchange_rate?: number | null
          frequency?: string | null
          id?: string | null
          import_hash?: string | null
          is_installment?: boolean | null
          is_recurring?: boolean | null
          is_refund?: boolean | null
          is_settled?: boolean | null
          is_shared?: boolean | null
          last_generated?: string | null
          last_generated_date?: string | null
          notes?: string | null
          notification_date?: string | null
          payer_id?: string | null
          recurrence_day?: number | null
          recurrence_pattern?: string | null
          refund_of_transaction_id?: string | null
          related_member_id?: string | null
          reminder_option?: string | null
          series_id?: string | null
          settled_at?: string | null
          source_transaction_id?: string | null
          split_user_ids?: never
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          total_installments?: number | null
          transaction_splits?: never
          trip_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"] | null
          updated_at?: string | null
          user_id?: string | null
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
            foreignKeyName: "transactions_creator_user_id_fkey"
            columns: ["creator_user_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
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
            referencedRelation: "active_family_members"
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
            foreignKeyName: "transactions_refund_of_transaction_id_fkey"
            columns: ["refund_of_transaction_id"]
            isOneToOne: false
            referencedRelation: "shared_transactions_view"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "transactions_refund_of_transaction_id_fkey"
            columns: ["refund_of_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_refund_of_transaction_id_fkey"
            columns: ["refund_of_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_ssot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_related_member_id_fkey"
            columns: ["related_member_id"]
            isOneToOne: false
            referencedRelation: "active_family_members"
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
            referencedRelation: "shared_transactions_view"
            referencedColumns: ["transaction_id"]
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
            referencedRelation: "transactions_ssot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "active_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_budget_summary"
            referencedColumns: ["trip_id"]
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
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_net_worth"
            referencedColumns: ["user_id"]
          },
        ]
      }
      trip_budget_summary: {
        Row: {
          available_budget: number | null
          remaining_budget: number | null
          total_budget: number | null
          total_settled: number | null
          total_spent: number | null
          trip_id: string | null
          trip_name: string | null
        }
        Relationships: []
      }
      user_net_worth: {
        Row: {
          assets_value: number | null
          bank_balance: number | null
          credit_card_debt: number | null
          shared_credit: number | null
          shared_debt: number | null
          user_id: string | null
        }
        Insert: {
          assets_value?: never
          bank_balance?: never
          credit_card_debt?: never
          shared_credit?: never
          shared_debt?: never
          user_id?: string | null
        }
        Update: {
          assets_value?: never
          bank_balance?: never
          credit_card_debt?: never
          shared_credit?: never
          shared_debt?: never
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_reset_all_data: { Args: never; Returns: undefined }
      admin_reset_single_user: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      assign_default_account_to_orphans: {
        Args: { p_default_account_id: string; p_user_id: string }
        Returns: number
      }
      calculate_balance_between_users: {
        Args: { p_currency?: string; p_user1_id: string; p_user2_id: string }
        Returns: {
          currency: string
          net_balance: number
          user1_owes: number
          user2_owes: number
        }[]
      }
      calculate_budget_spent: {
        Args: {
          p_category_id: string
          p_currency?: string
          p_end_date: string
          p_start_date: string
          p_user_id: string
        }
        Returns: number
      }
      calculate_credit_card_competence_date: {
        Args: {
          p_closing_day: number
          p_due_day: number
          p_transaction_date: string
        }
        Returns: string
      }
      calculate_credit_card_invoice: {
        Args: { p_account_id: string; p_end_date: string; p_start_date: string }
        Returns: number
      }
      calculate_member_balance: {
        Args: { p_member_id: string; p_user_id: string }
        Returns: {
          credits: number
          debits: number
          net_balance: number
        }[]
      }
      calculate_single_account_balance: {
        Args: { p_account_id: string }
        Returns: undefined
      }
      calculate_trip_spent: {
        Args: { p_trip_id: string; p_user_id?: string }
        Returns: number
      }
      check_account_dependencies: {
        Args: { p_account_id: string }
        Returns: Json
      }
      check_split_access: {
        Args: { p_transaction_id: string; p_user_id: string }
        Returns: boolean
      }
      clean_old_audit_logs: {
        Args: { p_days_to_keep: number }
        Returns: number
      }
      cleanup_old_pending_operations: { Args: never; Returns: number }
      clear_error_logs: { Args: never; Returns: undefined }
      clear_pin: { Args: never; Returns: boolean }
      confirm_settlement: {
        Args: {
          p_account_id: string
          p_is_receiving: boolean
          p_split_ids: string[]
          p_user_id: string
        }
        Returns: Json
      }
      confirm_settlement_receipt: {
        Args: {
          p_account_id: string
          p_category_id?: string
          p_creditor_id: string
          p_date: string
          p_exchange_rate?: number
          p_split_ids: string[]
        }
        Returns: Json
      }
      contribute_to_goal: {
        Args: {
          p_account_id?: string
          p_amount: number
          p_description?: string
          p_goal_id: string
        }
        Returns: Json
      }
      create_account_with_balance: {
        Args: {
          p_bank_color?: string
          p_bank_id?: string
          p_closing_day?: number
          p_credit_limit?: number
          p_currency?: string
          p_due_day?: number
          p_hide_balance?: boolean
          p_initial_balance?: number
          p_is_international?: boolean
          p_name: string
          p_type: string
          p_yield_rate?: number
          p_yield_type?: string
        }
        Returns: Json
      }
      create_account_with_initial_deposit: {
        Args: {
          p_bank?: string
          p_currency?: string
          p_initial_balance?: number
          p_name: string
          p_type: string
        }
        Returns: Json
      }
      create_installment_series: {
        Args: { p_transactions: Json; p_user_id?: string }
        Returns: Json
      }
      create_installment_series_v2: {
        Args: { p_transactions: Json }
        Returns: Json
      }
      create_transaction_with_splits: {
        Args: { p_splits?: Json; p_transaction: Json; p_user_id?: string }
        Returns: Json
      }
      create_transaction_with_splits_v2: {
        Args: { p_splits?: Json; p_transaction: Json }
        Returns: Json
      }
      delete_installment_series: {
        Args: { p_series_id: string }
        Returns: {
          deleted_count: number
        }[]
      }
      delete_user_account: { Args: never; Returns: undefined }
      expire_pending_settlements: { Args: never; Returns: Json }
      fn_create_notification:
        | {
            Args: {
              p_link?: string
              p_message: string
              p_title: string
              p_type: string
              p_user_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_link?: string
              p_message: string
              p_metadata: Json
              p_related_id: string
              p_title: string
              p_type: string
              p_user_id: string
            }
            Returns: undefined
          }
      fn_respond_family_invitation: {
        Args: { p_invitation_id: string; p_status: string }
        Returns: Json
      }
      fn_respond_trip_invitation: {
        Args: { p_invitation_id: string; p_status: string }
        Returns: Json
      }
      generate_pending_recurring_transactions: { Args: never; Returns: number }
      get_account_balance_at_date: {
        Args: { p_account_id: string; p_date?: string }
        Returns: number
      }
      get_account_balance_at_date_v2: {
        Args: { p_account_id: string; p_date: string }
        Returns: number
      }
      get_actual_closing_date: {
        Args: { p_closing_day: number; p_mode: string; p_year_month: string }
        Returns: string
      }
      get_admin_audit_logs: { Args: never; Returns: Json }
      get_admin_error_logs: { Args: never; Returns: Json }
      get_admin_system_stats: { Args: never; Returns: Json }
      get_admin_user_dossier: {
        Args: { target_user_id: string }
        Returns: Json
      }
      get_admin_users_detailed: { Args: never; Returns: Json }
      get_asset_performance: {
        Args: { p_asset_id: string }
        Returns: {
          asset_id: string
          current_value: number
          invested_amount: number
          profit_loss: number
          profit_loss_percentage: number
        }[]
      }
      get_credit_card_invoice: {
        Args: {
          p_account_id: string
          p_month_end: string
          p_month_start: string
          p_user_id: string
        }
        Returns: Json
      }
      get_current_shared_debts: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
        Returns: {
          currency: string
          member_id: string
          net_balance: number
          total_credits: number
          total_debits: number
        }[]
      }
      get_current_shared_debts_v2: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          currency: string
          member_id: string
          net_balance: number
          total_credits: number
          total_debits: number
        }[]
      }
      get_dashboard_summary: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: Json
      }
      get_dashboard_summary_v2: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: Json
      }
      get_expenses_by_category: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: {
          category_icon: string
          category_id: string
          category_name: string
          percentage: number
          total_amount: number
          transaction_count: number
        }[]
      }
      get_family_consolidated_summary: {
        Args: { p_family_id: string; p_month_start?: string }
        Returns: {
          balance: number
          expense: number
          income: number
          linked_user_id: string
          member_id: string
          member_name: string
          patrimony: number
        }[]
      }
      get_goal_progress: {
        Args: { p_goal_id: string }
        Returns: {
          current_amount: number
          days_remaining: number
          goal_id: string
          percentage_complete: number
          remaining_amount: number
          target_amount: number
        }[]
      }
      get_monthly_evolution: {
        Args: { p_months?: number; p_user_id: string }
        Returns: {
          expenses: number
          income: number
          month_start: string
          month_year: string
          savings: number
        }[]
      }
      get_monthly_evolution_report: {
        Args: { p_months: number; p_user_id: string }
        Returns: Json
      }
      get_monthly_evolution_report_v2: {
        Args: { p_months: number }
        Returns: Json
      }
      get_monthly_financial_summary: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: {
          net_savings: number
          total_balance: number
          total_expenses: number
          total_income: number
        }[]
      }
      get_monthly_financial_summary_v2: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          net_savings: number
          total_balance: number
          total_expenses: number
          total_income: number
        }[]
      }
      get_monthly_projection: {
        Args: { p_currency?: string; p_end_date: string; p_user_id: string }
        Returns: {
          credit_card_invoices: number
          current_balance: number
          future_expenses: number
          future_income: number
          projected_balance: number
          shared_debts: number
        }[]
      }
      get_monthly_projection_v2: {
        Args: { p_currency?: string; p_end_date: string }
        Returns: {
          credit_card_invoices: number
          current_balance: number
          future_expenses: number
          future_income: number
          projected_balance: number
          shared_debts: number
        }[]
      }
      get_net_worth: { Args: { p_user_id: string }; Returns: Json }
      get_net_worth_v2: { Args: never; Returns: Json }
      get_pending_splits_for_settlement: {
        Args: {
          p_creditor_user_id: string
          p_currency?: string
          p_debtor_user_id: string
        }
        Returns: {
          amount: number
          currency: string
          date: string
          days_overdue: number
          description: string
          split_id: string
          transaction_id: string
        }[]
      }
      get_record_history: {
        Args: { p_record_id: string; p_table_name: string }
        Returns: {
          action: string
          changed_at: string
          changed_by_email: string
          changed_fields: string[]
          new_values: Json
          old_values: Json
        }[]
      }
      get_shared_expense_summary_by_person: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: Json
      }
      get_shared_expense_summary_by_person_v2: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: Json
      }
      get_shared_finances_summary: {
        Args: { p_user_id: string }
        Returns: {
          credits: number
          debits: number
          member_id: string
          member_name: string
          net_balance: number
        }[]
      }
      get_shared_invoice_data: { Args: { p_user_id: string }; Returns: Json }
      get_shared_invoice_data_v2: { Args: never; Returns: Json }
      get_shared_transactions_for_current_user: {
        Args: never
        Returns: {
          account_id: string
          category_id: string
          created_at: string
          date: string
          description: string
          domain: string
          is_mirror: boolean
          is_shared: boolean
          owner_user_id: string
          payer_id: string
          root_amount: number
          root_owner_user_id: string
          share_amount: number
          source_transaction_id: string
          splits: Json
          total_amount: number
          transaction_id: string
          type: string
          updated_at: string
        }[]
      }
      get_trip_financial_summary: {
        Args: { p_trip_id: string }
        Returns: {
          currency: string
          participants_count: number
          percentage_used: number
          remaining: number
          total_budget: number
          total_settled: number
          total_spent: number
          transactions_count: number
        }[]
      }
      get_trip_participant_balances: {
        Args: { p_trip_id: string }
        Returns: {
          balance: number
          currency: string
          name: string
          owes: number
          paid: number
          participant_id: string
          user_id: string
        }[]
      }
      get_trip_participant_balances_v2: {
        Args: { p_trip_id: string }
        Returns: {
          balance: number
          currency: string
          name: string
          owes: number
          paid: number
          participant_id: string
          user_id: string
        }[]
      }
      get_user_budgets_progress: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: {
          budget_amount: number
          budget_id: string
          budget_name: string
          category_icon: string
          category_id: string
          category_name: string
          currency: string
          percentage_used: number
          period: string
          remaining_amount: number
          spent_amount: number
        }[]
      }
      get_user_budgets_progress_v2: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          budget_amount: number
          budget_id: string
          budget_name: string
          category_icon: string
          category_id: string
          category_name: string
          currency: string
          percentage_used: number
          period: string
          remaining_amount: number
          spent_amount: number
        }[]
      }
      get_user_budgets_progress_with_rollover: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: {
          _original_budget: number
          _rollover: number
          budget_amount: number
          budget_id: string
          budget_name: string
          category_icon: string
          category_id: string
          category_name: string
          currency: string
          percentage_used: number
          period: string
          remaining_amount: number
          spent_amount: number
        }[]
      }
      get_user_budgets_progress_with_rollover_v2: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          _original_budget: number
          _rollover: number
          budget_amount: number
          budget_id: string
          budget_name: string
          category_icon: string
          category_id: string
          category_name: string
          currency: string
          percentage_used: number
          period: string
          remaining_amount: number
          spent_amount: number
        }[]
      }
      get_user_family_id: { Args: { _user_id: string }; Returns: string }
      get_user_transactions_ssot: {
        Args: {
          p_account_id?: string
          p_category_id?: string
          p_end_date?: string
          p_limit?: number
          p_start_date?: string
          p_trip_id?: string
          p_type?: string
          p_user_id: string
        }
        Returns: {
          account_id: string | null
          advanced_at: string | null
          amount: number
          asset_id: string | null
          category_id: string | null
          competence_date: string
          created_at: string
          creator_user_id: string | null
          currency: string | null
          current_installment: number | null
          date: string
          deleted_at: string | null
          deleted_by: string | null
          description: string
          destination_account_id: string | null
          destination_amount: number | null
          destination_currency: string | null
          domain: Database["public"]["Enums"]["transaction_domain"]
          enable_notification: boolean | null
          exchange_rate: number | null
          external_id: string | null
          frequency: string | null
          goal_id: string | null
          id: string
          idempotency_key: string | null
          import_hash: string | null
          is_installment: boolean
          is_recurring: boolean
          is_refund: boolean | null
          is_settled: boolean
          is_shared: boolean
          last_generated: string | null
          last_generated_date: string | null
          notes: string | null
          notification_date: string | null
          payer_id: string | null
          recurrence_day: number | null
          recurrence_pattern: string | null
          refund_of_transaction_id: string | null
          related_member_id: string | null
          reminder_option: string | null
          series_id: string | null
          settled_at: string | null
          source_transaction_id: string | null
          status: string
          sync_status: Database["public"]["Enums"]["sync_status"]
          total_installments: number | null
          trip_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_trip_ids: { Args: { p_user_id: string }; Returns: string[] }
      get_wealth_evolution: {
        Args: { p_currency?: string; p_months?: number; p_user_id: string }
        Returns: {
          balance: number
          month_label: string
        }[]
      }
      get_wealth_evolution_v2: {
        Args: { p_currency?: string; p_months?: number }
        Returns: {
          balance: number
          month_label: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_family_member_v2: {
        Args: { p_family_id: string; p_user_id: string }
        Returns: boolean
      }
      is_trip_member: {
        Args: { trip_id_param: string; user_id_param: string }
        Returns: boolean
      }
      mark_as_paid_by_debtor: {
        Args: { p_settlement_tx_id?: string; p_split_id: string }
        Returns: undefined
      }
      mark_as_received_by_creditor: {
        Args: { p_settlement_tx_id?: string; p_split_id: string }
        Returns: undefined
      }
      migrate_transactions_to_account: {
        Args: {
          p_from_account_id: string
          p_to_account_id: string
          p_user_id: string
        }
        Returns: number
      }
      permanent_delete_old_records: { Args: never; Returns: number }
      process_credit_card_invoices: { Args: never; Returns: undefined }
      process_daily_yields: { Args: never; Returns: undefined }
      reactivate_family_member: {
        Args: { p_member_id: string }
        Returns: undefined
      }
      reactivate_trip_member: {
        Args: { p_member_id: string }
        Returns: undefined
      }
      recalculate_account_balance: {
        Args: { p_account_id: string }
        Returns: number
      }
      recalculate_all_balances: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      reject_settlement_request: {
        Args: { p_reason?: string; p_split_id: string }
        Returns: Json
      }
      remove_family_member: {
        Args: { p_member_id: string; p_reason?: string; p_removed_by?: string }
        Returns: undefined
      }
      remove_trip_member: {
        Args: { p_member_id: string; p_reason?: string; p_removed_by?: string }
        Returns: undefined
      }
      reorder_trip_itinerary_v1: {
        Args: { p_expected_version: number; p_items: Json; p_trip_id: string }
        Returns: number
      }
      request_settlement: {
        Args: {
          p_account_id: string
          p_amount?: number
          p_is_payment: boolean
          p_split_ids: string[]
          p_user_id: string
        }
        Returns: Json
      }
      request_settlement_confirmation: {
        Args: {
          p_amount: number
          p_creditor_id: string
          p_currency?: string
          p_debtor_id: string
          p_split_ids: string[]
        }
        Returns: undefined
      }
      request_settlement_v2: {
        Args: {
          p_account_id: string
          p_amount?: number
          p_is_payment: boolean
          p_split_ids: string[]
        }
        Returns: Json
      }
      resolve_error_report: {
        Args: { p_report_id: string }
        Returns: undefined
      }
      restore_transaction: {
        Args: { p_transaction_id: string }
        Returns: undefined
      }
      search_transactions: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          amount: number
          category_id: string
          currency: string
          date: string
          description: string
          id: string
          type: string
        }[]
      }
      seed_default_categories: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      set_pin: {
        Args: { p_pin: string; p_require_on_open?: boolean }
        Returns: boolean
      }
      settle_balance_between_users: {
        Args: {
          p_settlement_transaction_id?: string
          p_user1_id: string
          p_user2_id: string
        }
        Returns: number
      }
      settle_compensated_splits: {
        Args: { p_split_ids: string[] }
        Returns: Json
      }
      settle_multiple_splits: {
        Args: { p_account_id: string; p_split_ids: string[]; p_user_id: string }
        Returns: Json
      }
      settle_partial_balance: {
        Args: {
          p_amount: number
          p_currency?: string
          p_settlement_transaction_id?: string
          p_user1_id: string
          p_user2_id: string
        }
        Returns: {
          amount_settled: number
          remaining_balance: number
          splits_settled: number
        }[]
      }
      settle_split: {
        Args: {
          p_account_id: string
          p_amount: number
          p_split_id: string
          p_user_id: string
        }
        Returns: Json
      }
      soft_delete_account: {
        Args: { p_account_id: string }
        Returns: undefined
      }
      soft_delete_transaction: {
        Args: { p_cascade?: string; p_transaction_id: string }
        Returns: number
      }
      submit_error_report: {
        Args: {
          p_context: string
          p_error_message: string
          p_stack_trace: string
        }
        Returns: string
      }
      suggest_payment_plan: {
        Args: {
          p_creditor_user_id: string
          p_currency?: string
          p_debtor_user_id: string
          p_monthly_payment: number
        }
        Returns: {
          month: number
          payment_amount: number
          remaining_balance: number
          splits_to_settle: number
        }[]
      }
      test_cascade_delete: {
        Args: never
        Returns: {
          message: string
          passed: boolean
          test_name: string
        }[]
      }
      transfer_between_accounts: {
        Args: {
          p_amount: number
          p_date?: string
          p_description?: string
          p_destination_amount?: number
          p_exchange_rate?: number
          p_from_account_id: string
          p_to_account_id: string
        }
        Returns: Json
      }
      undo_settlement: {
        Args: { p_split_id: string; p_user_id: string }
        Returns: Json
      }
      undo_settlement_v2: { Args: { p_split_id: string }; Returns: Json }
      undo_shared_settlements: {
        Args: { p_split_ids: string[] }
        Returns: Json
      }
      unsettle_multiple_splits: {
        Args: { p_split_ids: string[] }
        Returns: Json
      }
      unsettle_split: { Args: { p_split_id: string }; Returns: Json }
      user_can_view_trip: {
        Args: { p_trip_id: string; p_user_id: string }
        Returns: boolean
      }
      user_is_trip_member: {
        Args: { p_trip_id: string; p_user_id: string }
        Returns: boolean
      }
      verify_pin: { Args: { p_pin: string }; Returns: boolean }
      withdraw_from_account: {
        Args: {
          p_account_id: string
          p_amount: number
          p_date: string
          p_description: string
        }
        Returns: Json
      }
    }
    Enums: {
      account_type:
        | "CHECKING"
        | "SAVINGS"
        | "CREDIT_CARD"
        | "INVESTMENT"
        | "CASH"
        | "EMERGENCY_FUND"
        | "GLOBAL_ACCOUNT"
      family_role: "admin" | "editor" | "viewer"
      split_method: "EQUAL" | "PERCENTAGE" | "CUSTOM"
      sync_status: "SYNCED" | "PENDING" | "ERROR"
      transaction_domain: "PERSONAL" | "SHARED" | "TRAVEL"
      transaction_type:
        | "EXPENSE"
        | "INCOME"
        | "TRANSFER"
        | "WITHDRAWAL"
        | "DEPOSIT"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_type: [
        "CHECKING",
        "SAVINGS",
        "CREDIT_CARD",
        "INVESTMENT",
        "CASH",
        "EMERGENCY_FUND",
        "GLOBAL_ACCOUNT",
      ],
      family_role: ["admin", "editor", "viewer"],
      split_method: ["EQUAL", "PERCENTAGE", "CUSTOM"],
      sync_status: ["SYNCED", "PENDING", "ERROR"],
      transaction_domain: ["PERSONAL", "SHARED", "TRAVEL"],
      transaction_type: [
        "EXPENSE",
        "INCOME",
        "TRANSFER",
        "WITHDRAWAL",
        "DEPOSIT",
      ],
      trip_status: ["PLANNING", "ACTIVE", "COMPLETED", "CANCELLED"],
    },
  },
} as const
