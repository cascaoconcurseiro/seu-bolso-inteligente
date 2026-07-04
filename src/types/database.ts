import { Database as SupabaseDatabase } from "@/integrations/supabase/types";

export type Database = SupabaseDatabase;

export type Goal = Database["public"]["Tables"]["goals"]["Row"];
export type Asset = Database["public"]["Tables"]["assets"]["Row"];
export type Budget = Database["public"]["Tables"]["budgets"]["Row"];

export interface GoalProgress {
  goal_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  percentage_complete: number;
  percentage?: number;
  status: string;
}

export interface BudgetProgress {
  budget_id: string;
  budget_name: string;
  category_id: string | null;
  category_name: string | null;
  category_icon: string | null;
  budget_amount: number;
  spent_amount: number;
  remaining_amount: number;
  percentage_used: number;
  currency: string;
  period: string;
}

export interface AssetPerformance {
  asset_id: string;
  ticker: string | null;
  name: string;
  quantity: number;
  avg_purchase_price: number;
  current_price: number;
  total_invested: number;
  current_value: number;
  profit_loss: number;
  profit_loss_percentage: number;
}
