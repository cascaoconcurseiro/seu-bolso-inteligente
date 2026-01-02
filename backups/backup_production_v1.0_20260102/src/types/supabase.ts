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
      budgets: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          currency: string
          deleted: boolean | null
          id: string
          is_active: boolean
          name: string
          period: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          currency?: string
          deleted?: boolean | null
          id?: string
          is_active?: boolean
          name: string
          period?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          deleted?: boolean | null
          id?: string
          is_active?: boolean
          name?: string
          period?: string
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
      family_invitations: {
        Row: {
          created_at: string
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
          scope_end_date: string | null
          scope_start_date: string | null
          scope_trip_id: string | null
          sharing_scope: string | null
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
          scope_end_date?: string | null
          scope_start_date?: string | null
          scope_trip_id?: string | null
          sharing_scope?: string | null
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
        ]
      }
      notification_preferences: {
        Row: {
          budget_warning_enabled: boolean | null
          budget_warning_threshold: number | null
          created_at: string | null
          email_notifications: boolean | null
          id: string
          invoice_due_days_before: number | null
          invoice_due_enabled: boolean | null
          push_notifications: boolean | null
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
          email_notifications?: boolean | null
          id?: string
          invoice_due_days_before?: number | null
          invoice_due_enabled?: boolean | null
          push_notifications?: boolean | null
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
          email_notifications?: boolean | null
          id?: string
          invoice_due_days_before?: number | null
          invoice_due_enabled?: boolean | null
          push_notifications?: boolean | null
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
      pending_operations: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          last_error: string | null
          max_retries: number
          next_retry_at: string | null
          operation_type: string
          payload: Json
          retry_count: number
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          max_retries?: number
          next_retry_at?: string | null
          operation_type: string
          payload: Json
          retry_count?: number
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          max_retries?: number
          next_retry_at?: string | null
          operation_type?: string
          payload?: Json
          retry_count?: number
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_operations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_operations_user_id_fkey"
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
          competence_date: string
          created_at: string
          creator_user_id: string | null
          currency: string | null
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
          last_generated_date: string | null
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
          competence_date: string
          created_at?: string
          creator_user_id?: string | null
          currency?: string | null
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
          last_generated_date?: string | null
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
          competence_date?: string
          created_at?: string
          creator_user_id?: string | null
          currency?: string | null
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
          last_generated_date?: string | null
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
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_invitations: {
        Row: {
          created_at: string | null
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
      trip_members: {
        Row: {
          can_edit_details: boolean | null
          can_manage_expenses: boolean | null
          created_at: string | null
          id: string
          personal_budget: number | null
          role: string
          trip_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_edit_details?: boolean | null
          can_manage_expenses?: boolean | null
          created_at?: string | null
          id?: string
          personal_budget?: number | null
          role?: string
          trip_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_edit_details?: boolean | null
          can_manage_expenses?: boolean | null
          created_at?: string | null
          id?: string
          personal_budget?: number | null
          role?: string
          trip_id?: string
          updated_at?: string | null
          user_id?: string
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
            foreignKeyName: "trip_members_trip_id_fkey"
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
      calculate_account_balance: {
        Args: { p_account_id: string }
        Returns: number
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
      calculate_trip_spent: {
        Args: { p_trip_id: string; p_user_id?: string }
        Returns: number
      }
      cleanup_old_pending_operations: { Args: never; Returns: number }
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
      get_monthly_financial_summary: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: {
          net_savings: number
          total_balance: number
          total_expenses: number
          total_income: number
        }[]
      }
      get_monthly_projection: {
        Args: { p_end_date: string; p_user_id: string }
        Returns: {
          credit_card_invoices: number
          current_balance: number
          future_expenses: number
          future_income: number
          projected_balance: number
          shared_debts: number
        }[]
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
      get_trip_financial_summary: {
        Args: { p_trip_id: string }
        Returns: {
          currency: string
          participants_count: number
          percentage_used: number
          remaining: number
          total_budget: number
          total_spent: number
          transactions_count: number
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
      get_user_family_id: { Args: { _user_id: string }; Returns: string }
      get_user_trip_ids: { Args: { p_user_id: string }; Returns: string[] }
      is_family_member: {
        Args: { fam_id: string; usr_id: string }
        Returns: boolean
      }
      is_member_of_family: {
        Args: { fam_id: string; usr_id: string }
        Returns: boolean
      }
      is_trip_member: {
        Args: { trip_id_param: string; user_id_param: string }
        Returns: boolean
      }
      recalculate_all_account_balances: {
        Args: never
        Returns: {
          account_id: string
          account_name: string
          new_balance: number
          old_balance: number
        }[]
      }
      transfer_between_accounts:
        | {
            Args: {
              p_amount: number
              p_date?: string
              p_description?: string
              p_from_account_id: string
              p_to_account_id: string
            }
            Returns: Json
          }
        | {
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
      user_can_view_trip:
        | { Args: { p_trip_id: string; p_user_id: string }; Returns: boolean }
        | { Args: { trip_id: string }; Returns: boolean }
      user_is_trip_member: {
        Args: { p_trip_id: string; p_user_id: string }
        Returns: boolean
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
